export function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decode64(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url');
  return Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)), char => char.charCodeAt(0));
}
export async function digest(value: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}
async function aesKey(secret: string) {
  const bytes = decode64(secret);
  if (bytes.length !== 32) throw new Error('Invalid encryption key');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value: string, secret: string, context: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) }, await aesKey(secret), new TextEncoder().encode(value));
  return `v1.${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}
export async function unseal(value: string, secret: string, context: string): Promise<string> {
  const [version, iv, ciphertext] = value.split('.');
  if (version !== 'v1') throw new Error('Unsupported encryption version');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode64(iv), additionalData: new TextEncoder().encode(context) }, await aesKey(secret), decode64(ciphertext));
  return new TextDecoder().decode(plaintext);
}
