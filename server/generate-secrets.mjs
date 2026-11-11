import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function generateSecrets(destination) {
  const text = readFileSync(destination, 'utf8');
  const names = ['TOKEN_ENCRYPTION_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT'];
  if (names.some(name => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`, 'm').test(text))) {
    throw new Error('Push settings already exist; no keys were changed');
  }
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  const secrets = {
    TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
    VAPID_PUBLIC_KEY: Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url'),
    VAPID_PRIVATE_KEY: jwk.d,
    VAPID_SUBJECT: 'https://gangabass.duckdns.org',
  };
  // Exclusive creation preserves the old file and avoids overwriting any keys.
  writeFileSync(`${destination}.next`, `${text}\n${Object.entries(secrets).map(([name, value]) => `${name}=${value}`).join('\n')}\n`, { flag: 'wx', mode: 0o600 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateSecrets(process.argv[2] || 'server/.env');
  console.log('New keys saved to .env.next. Rename it to .env; secret values were not printed.');
}
