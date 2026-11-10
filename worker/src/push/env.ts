export interface PushEnv {
  PUSH_DB?: D1Database;
  TOKEN_ENCRYPTION_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}
export function pushConfigured(env: PushEnv): boolean {
  return !!(env.PUSH_DB && env.TOKEN_ENCRYPTION_KEY && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);
}
