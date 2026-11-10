import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import type { PushEnv } from './env';
import { decode64 } from './crypto';
export interface NotificationPayload { title: string; body: string; tag: string; url: string }
export function validateSubscription(value: unknown): PushSubscription {
  if (!value || typeof value !== 'object') throw new Error('Invalid subscription');
  const subscription = value as PushSubscription;
  const url = new URL(subscription.endpoint);
  const host = url.hostname;
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || subscription.endpoint.length > 4096 ||
    !(host === 'fcm.googleapis.com' || host === 'web.push.apple.com' || host.endsWith('.push.apple.com') || host === 'updates.push.services.mozilla.com' || host.endsWith('.push.services.mozilla.com') || host.endsWith('.notify.windows.com'))) throw new Error('Unsupported push endpoint');
  if (typeof subscription.expirationTime === 'number' && subscription.expirationTime <= Date.now()) throw new Error('Expired subscription');
  if (decode64(subscription.keys.p256dh).length !== 65 || decode64(subscription.keys.p256dh)[0] !== 4 || decode64(subscription.keys.auth).length !== 16) throw new Error('Invalid subscription keys');
  return { endpoint: url.href, expirationTime: typeof subscription.expirationTime === 'number' && Number.isFinite(subscription.expirationTime) ? subscription.expirationTime : null, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } };
}
export async function sendPush(subscription: PushSubscription, payload: NotificationPayload, env: PushEnv): Promise<Response> {
  validateSubscription(subscription);
  const request = await buildPushPayload({ data: { ...payload }, options: { ttl: 86400, urgency: 'normal' } }, subscription, {
    subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY,
  });
  const response = await fetch(subscription.endpoint, { ...request, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  // Push responses need only status/headers; release the connection before the next device.
  try { await response.body?.cancel(); } catch { /* Status is already available. */ }
  return response;
}
