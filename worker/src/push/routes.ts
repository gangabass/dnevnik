import { ApiFailure, dnevnik } from '../upstream';
import type { PushEnv } from './env';
import { pushConfigured } from './env';
import { decode64, digest, seal } from './crypto';
import { PushStore, type Device } from './store';
import { markVersions, marksPath } from './poller';
import { sendPush, validateSubscription } from './transport';

export interface PushReply { data: unknown; status?: number }
function credentials(request: Request) {
  const id = request.headers.get('X-Push-Device') || '';
  const secret = request.headers.get('X-Push-Key') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(secret) || decode64(secret).length !== 32) throw new ApiFailure('Нет ключа управления подпиской.',401);
  return { id, secret };
}
async function body(request: Request) {
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let text = ''; let size = 0;
  if (reader) while (true) {
    const part = await reader.read(); if (part.done) break;
    size += part.value.byteLength;
    if (size > 16000) { await reader.cancel(); throw new ApiFailure('Слишком большой запрос.',413); }
    text += decoder.decode(part.value,{stream:true});
  }
  text += decoder.decode();
  try { const value = JSON.parse(text); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; } catch { throw new ApiFailure('Некорректный JSON.',400); }
}
export async function pushRoute(request: Request, env: PushEnv): Promise<PushReply> {
  const path = new URL(request.url).pathname;
  if (path === '/api/push/config' && request.method === 'GET') return { data: { ok:true, configured:pushConfigured(env), publicKey: env.VAPID_PUBLIC_KEY || null, intervalMinutes:5 } };
  if (!pushConfigured(env)) throw new ApiFailure('Фоновые уведомления ещё не настроены на сервере.',503);
  const store = new PushStore(env.PUSH_DB!);
  const credential = credentials(request);
  const ownerHash = await digest(credential.secret);
  const existing = await store.get(credential.id);
  if (existing && existing.owner_hash !== ownerHash) throw new ApiFailure('Подписка не найдена.',404);
  if (path === '/api/push/subscription' && request.method === 'GET') return { data: { ok:true, enabled:!!existing,
    state: existing?.state ?? 'disabled', personId:existing?.person_id, schoolId:existing?.school_id,
    lastCheckAt:existing?.last_check_at, lastSuccessAt:existing?.last_success_at, lastPushAt:existing?.last_push_at,
    lastError:existing?.last_error, pending:existing ? await store.pending(existing.id) : 0, intervalMinutes:5 } };
  if (path === '/api/push/subscription' && request.method === 'DELETE') {
    await store.remove(credential.id,ownerHash);
    return { data:{ok:true,enabled:false} };
  }
  if (path === '/api/push/subscription' && request.method === 'POST') {
    const token = /^Bearer ([^\s\x00-\x1f]+)$/.exec(request.headers.get('Authorization') || '')?.[1];
    if (!token || token.length > 4096) throw new ApiFailure('Введите токен Дневник.ру.',401);
    const input = await body(request);
    const person = String(input.personId ?? ''); const school = String(input.schoolId ?? '');
    if (!/^[1-9]\d{0,19}$/.test(person) || !/^[1-9]\d{0,19}$/.test(school)) throw new ApiFailure('Проверьте ID ученика и школы.',400);
    let subscription;
    try { subscription = validateSubscription(input.subscription); }
    catch { throw new ApiFailure('Браузер вернул некорректную push-подписку.',400); }
    const endpointHash = await digest(subscription.endpoint);
    const owner = await store.endpointOwner(endpointHash);
    if (owner && owner.id !== credential.id) throw new ApiFailure('Подписка уже привязана к другому устройству. Пересоздайте подписку в браузере.',409);
    // Verify access to the selected child, not only that the token has a profile.
    const marks = await dnevnik(marksPath(person,school),token);
    const baseline = await markVersions(marks);
    const sameTarget = existing?.person_id === person && existing.school_id === school;
    const now = Date.now();
    const device = { id:credential.id,owner_hash:ownerHash,endpoint_hash:endpointHash,
      token_cipher:await seal(token,env.TOKEN_ENCRYPTION_KEY!,`token:${credential.id}`),
      subscription_cipher:await seal(JSON.stringify(subscription),env.TOKEN_ENCRYPTION_KEY!,`subscription:${credential.id}`),
      person_id:person,school_id:school,student_name:String(input.studentName ?? '').slice(0,80),
      generation:sameTarget ? existing.generation : crypto.randomUUID(),created_at:existing?.created_at ?? now,updated_at:now,
    } as Device;
    await store.save(device,sameTarget ? null : baseline);
    return { data:{ok:true,enabled:true,state:'active',intervalMinutes:5} };
  }
  if (path === '/api/push/test' && request.method === 'POST') {
    if (!existing) throw new ApiFailure('Сначала включите фоновые уведомления.',404);
    if (!await store.testLease(existing.id,ownerHash,Date.now())) throw new ApiFailure('Тест можно отправить раз в минуту.',429);
    const { unseal } = await import('./crypto');
    const subscription = validateSubscription(JSON.parse(await unseal(existing.subscription_cipher,env.TOKEN_ENCRYPTION_KEY!,`subscription:${existing.id}`)));
    const response = await sendPush(subscription,{title:'Дневник: проверка уведомлений',body:'Фоновая push-подписка работает. Проверка оценок — каждые 5 минут.',tag:'dnevnik-test',url:'/dnevnik/?tab=push'},env);
    if (response.status === 404 || response.status === 410) { await store.remove(existing.id,ownerHash); throw new ApiFailure('Push-подписка истекла. Включите её заново.',410); }
    if (!response.ok) throw new ApiFailure('Push-сервис не принял уведомление. Проверьте настройки сервера.',502);
    return {data:{ok:true}};
  }
  return {data:{error:'Not found'},status:404};
}
