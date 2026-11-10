import { webcrypto as crypto } from 'node:crypto';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const destination = new URL('.push-secrets.json', root);
if (existsSync(destination)) {
  console.log('Secrets already exist; existing encryption and VAPID keys were kept.');
  process.exit(0);
}
const pair = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const jwk = await crypto.subtle.exportKey('jwk',pair.privateKey);
const publicBytes = await crypto.subtle.exportKey('raw',pair.publicKey);
const encode = value => Buffer.from(value).toString('base64url');
const secrets = {
  TOKEN_ENCRYPTION_KEY:encode(crypto.getRandomValues(new Uint8Array(32))),
  VAPID_PUBLIC_KEY:encode(publicBytes), VAPID_PRIVATE_KEY:jwk.d,
  VAPID_SUBJECT:process.env.VAPID_SUBJECT || 'https://github.com/gangabass/dnevnik',
};
writeFileSync(destination,JSON.stringify(secrets,null,2)+'\n',{mode:0o600,flag:'wx'});
const devVars = new URL('.dev.vars', root);
const existing = existsSync(devVars) ? readFileSync(devVars,'utf8') : '';
const names = Object.keys(secrets);
if (!names.some(name => new RegExp(`^${name}\\s*=`,'m').test(existing))) {
  writeFileSync(devVars,existing+'\n'+Object.entries(secrets).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n',{mode:0o600});
} else console.log('Existing .dev.vars keys were not overwritten.');
console.log('Created .push-secrets.json and local .dev.vars. Secret values were not printed.');
console.log('Keep these keys: regenerating them prevents decryption and requires resubscribing devices.');
