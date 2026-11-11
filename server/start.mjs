import worker from './generated/worker.mjs';
import { SqliteDatabase } from './sqlite.mjs';
import { createApiServer } from './http.mjs';
import { fileURLToPath } from 'node:url';

const origins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
if (!origins.size || [...origins].some(value => new URL(value).origin !== value)) {
  throw new Error('Set ALLOWED_ORIGINS to comma-separated HTTPS origins without paths or trailing slashes');
}
const database = new SqliteDatabase(process.env.DATABASE_PATH || '/data/push.sqlite',
  fileURLToPath(new URL('../worker/migrations/', import.meta.url)));
const env = { PUSH_DB: database };
for (const key of ['TOKEN_ENCRYPTION_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']) {
  if (process.env[key]) env[key] = process.env[key];
}
const keyCount = Object.keys(env).length - 1;
if (keyCount && keyCount !== 4) throw new Error('Configure all four push secrets, or leave all four unset');
const server = createApiServer(worker, env, origins);
let stopping = false;
let active = null;
function tick() {
  if (stopping || active || !keyCount) return;
  active = worker.scheduled({}, env).catch(() => console.error('push_cron_failed')).finally(() => { active = null; });
}
const timer = setInterval(tick, 300000);
server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => {
  console.log('dnevnik_api_listening');
  tick();
});
async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  const deadline = setTimeout(() => process.exit(1), 25000);
  deadline.unref();
  await Promise.all([new Promise(resolve => server.close(resolve)), active]);
  database.close();
  clearTimeout(deadline);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
