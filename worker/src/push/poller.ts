import { ApiFailure, dnevnik } from '../upstream';
import { rows, row, id, key } from '../dnevnik';
import { digest, seal, unseal } from './crypto';
import type { PushEnv } from './env';
import { pushConfigured } from './env';
import { PushStore, type Device, type Outbox, type Seen } from './store';
import { sendPush, type NotificationPayload, validateSubscription } from './transport';

export function marksPath(person: string, school: string, now = new Date()): string {
  // Dates are chosen in the school's region (UTC+8), not the Worker host timezone.
  const end = new Date(now.getTime() + 8 * 3600000);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 30);
  return `persons/${person}/schools/${school}/marks/${start.toISOString().slice(0,10)}T00:00:00/${end.toISOString().slice(0,10)}T23:59:59.999999`;
}
export async function markVersions(value: unknown): Promise<Seen[]> {
  if (!Array.isArray(value)) throw new Error('Unexpected marks');
  return Promise.all(rows(value).filter(mark => key(mark) && (mark.textValue ?? mark.value) != null).map(async mark => ({
    mark_id: key(mark), value_hash: await digest(String(mark.textValue ?? mark.value)),
  })));
}
export async function changedMarks(value: unknown, seen: Seen[]) {
  const known = new Map(seen.map(mark => [mark.mark_id, mark.value_hash]));
  const unique = new Map(rows(value).map(mark => [key(mark),mark]));
  const changes = [];
  for (const mark of unique.values()) if (key(mark) && (mark.textValue ?? mark.value) != null && known.get(key(mark)) !== await digest(String(mark.textValue ?? mark.value))) changes.push(mark);
  return changes;
}
async function event(device: Device, eventKey: string, payload: NotificationPayload, env: PushEnv, now: number): Promise<Outbox> {
  const eventId = crypto.randomUUID();
  return { id: eventId, device_id: device.id, generation: device.generation, event_key: eventKey,
    payload_cipher: await seal(JSON.stringify(payload), env.TOKEN_ENCRYPTION_KEY!, `event:${device.id}:${eventId}`), created_at: now, next_attempt: now, attempts: 0 };
}
async function poll(device: Device, store: PushStore, env: PushEnv, now: number) {
  if (device.state !== 'active' || !device.token_cipher || device.next_check_at > now) return;
  let token: string;
  try { token = await unseal(device.token_cipher,env.TOKEN_ENCRYPTION_KEY!,`token:${device.id}`); }
  catch { await store.failed(device,'TOKEN_DECRYPTION_FAILED',now); return; }
  try {
    const marks = await dnevnik(marksPath(device.person_id,device.school_id,new Date(now)),token);
    const versions = await markVersions(marks);
    const changes = await changedMarks(marks,await store.seen(device.id));
    const events: Outbox[] = [];
    let subjects: unknown = []; let lessons: unknown = [];
    if (changes.length) {
      [subjects, lessons] = await Promise.all([
        dnevnik(`schools/${device.school_id}/subjects`,token).catch(() => []),
        dnevnik('lessons/many',token,undefined,{lessons:[...new Set(changes.map(mark => id(mark.lesson_str ?? mark.lesson)).filter(Boolean))]}).catch(() => []),
      ]);
    }
    const subjectNames = new Map(rows(subjects).map(subject => [key(subject),String(subject.name ?? '')]));
    const lessonMap = new Map(rows(Array.isArray(lessons) ? lessons : row(lessons).lessons).map(lesson => [key(lesson),lesson]));
    for (const mark of changes) {
      const value = String(mark.textValue ?? mark.value).slice(0,20);
      const lesson = lessonMap.get(id(mark.lesson_str ?? mark.lesson));
      const subject = subjectNames.get(id(lesson?.subjectId));
      const eventKey = await digest(`${key(mark)}:${value}`);
      const payload = { title: subject ? `${subject.slice(0,100)}: ${value}` : `Новая оценка: ${value}`,
        body: device.student_name ? `Ученик: ${device.student_name}` : 'Откройте дневник, чтобы посмотреть подробности.',
        tag: `grade-${key(mark)}-${eventKey.slice(0,12)}`, url: '/dnevnik/?tab=grades' };
      events.push(await event(device,eventKey,payload,env,now));
    }
    await store.record(device,versions,events,now);
  } catch (error) {
    if (error instanceof ApiFailure && [401,403].includes(error.status)) {
      const state = error.status === 401 ? 'token_expired' : 'access_denied';
      const payload = { title: 'Дневник: обновите подключение', body: error.status === 401 ? 'Токен истёк. Введите новый токен для проверки оценок.' : 'Доступ к оценкам закрыт. Проверьте подключение ученика.', tag: 'dnevnik-token', url: '/dnevnik/?tab=push' };
      await store.pause(device,state,await event(device,state,payload,env,now),now);
    } else await store.failed(device,error instanceof ApiFailure && error.status === 429 ? 'API_RATE_LIMIT' : 'API_UNAVAILABLE',now);
  }
}
export async function deliver(device: Device, store: PushStore, env: PushEnv, now: number) {
  if (!await store.guard(device)) return;
  let subscription;
  try { subscription = validateSubscription(JSON.parse(await unseal(device.subscription_cipher,env.TOKEN_ENCRYPTION_KEY!,`subscription:${device.id}`))); }
  catch { await store.failed(device,'SUBSCRIPTION_DECRYPTION_FAILED',now); return; }
  for (const item of await store.queue(device,now)) {
    if (!await store.guard(device)) return;
    try {
      const payload = JSON.parse(await unseal(item.payload_cipher,env.TOKEN_ENCRYPTION_KEY!,`event:${device.id}:${item.id}`)) as NotificationPayload;
      const response = await sendPush(subscription,payload,env);
      if (response.ok) await store.sent(device,item,now);
      else if (response.status === 404 || response.status === 410) { await store.expired(device); break; }
      else {
        const seconds = Number(response.headers.get('Retry-After'));
        await store.retry(device,item,[401,403].includes(response.status) ? 'PUSH_AUTH_FAILED' : 'PUSH_RETRY',now, Number.isFinite(seconds) ? Math.min(86400000, Math.max(0,seconds*1000)) : 0);
        break;
      }
    } catch { await store.retry(device,item,'PUSH_RETRY',now); break; }
  }
}
export async function runPushCron(env: PushEnv): Promise<void> {
  if (!pushConfigured(env)) { console.warn('push_cron_not_configured'); return; }
  const store = new PushStore(env.PUSH_DB!);
  const due = await store.due(Date.now());
  // Limit concurrency and acquire a per-device lease; overlapping cron invocations are safe.
  for (let index=0; index<due.length; index+=3) await Promise.all(due.slice(index,index+3).map(async candidate => {
    const device = await store.claim(candidate.id,crypto.randomUUID(),Date.now());
    if (!device) return;
    try { await poll(device,store,env,Date.now()); await deliver(device,store,env,Date.now()); }
    catch { console.error('push_device_processing_failed'); }
    finally { await store.release(device); }
  }));
}
