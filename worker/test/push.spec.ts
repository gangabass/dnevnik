import { describe, it, expect } from 'vitest';
import { base64url, seal, unseal, digest } from '../src/push/crypto';
import { changedMarks, markVersions, marksPath } from '../src/push/poller';
import { validateSubscription } from '../src/push/transport';
import worker from '../src';
const secret = base64url(new Uint8Array(32).fill(7));
describe('Push encryption and detection', () => {
  it('encrypts credentials with independent IVs and binds them to device and field', async () => {
    const a = await seal('synthetic-token',secret,'token:device1');
    const b = await seal('synthetic-token',secret,'token:device1');
    expect(a).not.toBe(b); expect(a).not.toContain('synthetic-token');
    expect(await unseal(a,secret,'token:device1')).toBe('synthetic-token');
    await expect(unseal(a,secret,'token:device2')).rejects.toThrow();
    await expect(unseal(a,secret,'subscription:device1')).rejects.toThrow();
  });
  it('rejects incorrect encryption keys', async () => {
    await expect(seal('secret','abc','context')).rejects.toThrow();
  });
  it('does not notify for a baseline, detects new and changed grades', async () => {
    const initial = [{id_str:'2554348713925291122',value:'4'}];
    const seen = await markVersions(initial);
    expect(await changedMarks(initial,seen)).toEqual([]);
    expect(await changedMarks([...initial,{id:'2',value:'5'}],seen)).toHaveLength(1);
    expect(await changedMarks([{id_str:initial[0].id_str,value:'5'}],seen)).toHaveLength(1);
    expect(seen[0].value_hash).toBe(await digest('4'));
  });
  it('uses the Irkutsk calendar date across UTC midnight', () => {
    const path = marksPath('111','222',new Date('2026-11-10T17:00:00Z'));
    expect(path).toContain('/2026-10-12T00:00:00/2026-11-11T23:59:59.999999');
  });
  it('rejects arbitrary or private push destinations and malformed keys', () => {
    const keys = {p256dh:base64url(Uint8Array.from([4,...new Array(64).fill(1)])),auth:base64url(new Uint8Array(16))};
    expect(validateSubscription({endpoint:'https://fcm.googleapis.com/fcm/send/test',keys}).endpoint).toContain('fcm.googleapis.com');
    for (const endpoint of ['http://fcm.googleapis.com/test','https://localhost/test','https://169.254.169.254/test','https://fcm.googleapis.com.evil.example/test','https://name:password@fcm.googleapis.com/test']) expect(()=>validateSubscription({endpoint,keys})).toThrow();
    expect(()=>validateSubscription({endpoint:'https://fcm.googleapis.com/test',keys:{auth:'abc',p256dh:'abc'}})).toThrow();
  });
  it('keeps old API usable before push is configured', async () => {
    const response = await worker.fetch(new Request('https://example.com/api/push/config'),{});
    expect(await response.json()).toMatchObject({configured:false,intervalMinutes:5});
    const subscription = await worker.fetch(new Request('https://example.com/api/push/subscription'),{});
    expect(subscription.status).toBe(503);
  });
});
