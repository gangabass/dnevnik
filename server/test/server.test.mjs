import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { generateSecrets } from '../generate-secrets.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SqliteDatabase } from '../sqlite.mjs';
import { createApiServer } from '../http.mjs';
import worker from '../generated/worker.mjs';

const migrations = fileURLToPath(new URL('../../worker/migrations/', import.meta.url));
test('fresh push keys match, preserve settings and refuse replacement', () => {
  const folder = mkdtempSync(join(tmpdir(), 'dnevnik-secrets-'));
  const filename = join(folder, '.env');
  try {
    const original = 'ALLOWED_ORIGINS=https://example.github.io\n';
    writeFileSync(filename, original);
    generateSecrets(filename);
    assert.equal(readFileSync(filename, 'utf8'), original);
    const generated = readFileSync(`${filename}.next`, 'utf8');
    assert.ok(generated.startsWith(original));
    const settings = Object.fromEntries(generated.trim().split('\n').map(line => line.split(/=(.*)/s).slice(0, 2)));
    assert.equal(Buffer.from(settings.TOKEN_ENCRYPTION_KEY, 'base64url').length, 32);
    const publicBytes = Buffer.from(settings.VAPID_PUBLIC_KEY, 'base64url');
    assert.equal(publicBytes.length, 65);
    const jwk = { kty: 'EC', crv: 'P-256', x: publicBytes.subarray(1, 33).toString('base64url'), y: publicBytes.subarray(33).toString('base64url'), d: settings.VAPID_PRIVATE_KEY };
    const privateKey = createPrivateKey({ key: jwk, format: 'jwk' });
    const message = Buffer.from('synthetic push check');
    assert.ok(verify('sha256', message, createPublicKey(privateKey), sign('sha256', message, privateKey)));
    writeFileSync(filename, generated);
    assert.throws(() => generateSecrets(filename), /already exist/);
    assert.equal(readFileSync(filename, 'utf8'), generated);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
test('SQLite rolls back a failed batch and persists data across restarts and migrations', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'dnevnik-'));
  let database;
  try {
    database = new SqliteDatabase(join(folder, 'push.sqlite'), migrations);
    database.sql.exec('CREATE TABLE probe (id TEXT PRIMARY KEY)');
    await assert.rejects(database.batch([
      database.prepare('INSERT INTO probe VALUES (?)').bind('same'),
      database.prepare('INSERT INTO probe VALUES (?)').bind('same'),
    ]));
    assert.equal(await database.prepare('SELECT * FROM probe').first(), null);
    await database.batch([database.prepare('INSERT INTO probe VALUES (?)').bind('saved')]);
    database.close();
    database = new SqliteDatabase(join(folder, 'push.sqlite'), migrations);
    assert.equal(await database.prepare('SELECT id FROM probe').first('id'), 'saved');
    assert.equal((await database.prepare('SELECT * FROM server_migrations').all()).results.length, 1);
  } finally { database?.close(); rmSync(folder, { recursive: true, force: true }); }
});

test('HTTP serves the real API, allows Pages preflight and rejects other origins and oversized bodies', async () => {
  const server = createApiServer(worker, {}, new Set(['https://example.github.io']));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    let response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
    response = await fetch(`${base}/api/profile`, { method: 'OPTIONS', headers: {
      Origin: 'https://example.github.io', 'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,x-push-key,x-push-device',
    } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://example.github.io');
    assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
    response = await fetch(`${base}/api/profile`, { headers: { Origin: 'https://example.github.io' } });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://example.github.io');
    response = await fetch(`${base}/api/health`, { headers: { Origin: 'https://other.example' } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    response = await fetch(`${base}/api/push/subscription`, { method: 'POST', body: 'x'.repeat(65537) });
    assert.equal(response.status, 413);
    assert.equal((await fetch(`${base}/missing`)).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
