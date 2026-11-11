/// <reference types="node" />
import { runInNewContext } from 'node:vm';
import { SqliteDatabase } from '../../server/sqlite.mjs';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PushStore, type Device, type Outbox } from '../src/push/store';
import { base64url, digest, unseal, seal } from '../src/push/crypto';
import { pushRoute } from '../src/push/routes';
import { runPushCron } from '../src/push/poller';
import type { PushEnv } from '../src/push/env';

class SqliteD1 extends SqliteDatabase {
  constructor(){super(':memory:',fileURLToPath(new URL('../migrations/',import.meta.url)));}
}
const id='11111111-1111-4111-8111-111111111111';
const managementKey=base64url(new Uint8Array(32).fill(8));
const token='synthetic-dnevnik-token';
const header={'X-Push-Device':id,'X-Push-Key':managementKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
let sqlite:SqliteD1,env:PushEnv,subscription:any;
let instant=Date.parse('2026-11-10T04:00:00Z');
beforeEach(async()=>{
  sqlite=new SqliteD1();
  const vapid=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']) as CryptoKeyPair;
  const jwk=await crypto.subtle.exportKey('jwk',vapid.privateKey) as JsonWebKey;
  const browser=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']) as CryptoKeyPair;
  subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',expirationTime:null,keys:{p256dh:base64url(new Uint8Array(await crypto.subtle.exportKey('raw',browser.publicKey) as ArrayBuffer)),auth:base64url(new Uint8Array(16).fill(9))}};
  env={PUSH_DB:sqlite as unknown as D1Database,TOKEN_ENCRYPTION_KEY:base64url(new Uint8Array(32).fill(7)),VAPID_PUBLIC_KEY:base64url(new Uint8Array(await crypto.subtle.exportKey('raw',vapid.publicKey) as ArrayBuffer)),VAPID_PRIVATE_KEY:jwk.d,VAPID_SUBJECT:'https://example.com'};
  vi.spyOn(Date,'now').mockImplementation(()=>instant);
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();sqlite.sql.close();});
function request(method='POST',path='/api/push/subscription',headers=header){return new Request('https://worker.test'+path,{method,headers,...(method==='POST'&&path.endsWith('subscription')?{body:JSON.stringify({personId:'111',schoolId:'222',studentName:'Ученик',subscription})}:{})});}
async function register(marks:any[]=[{id:'1',value:'4'}]){
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(marks)));
  await pushRoute(request(),env);
}
describe('D1 push lifecycle',()=>{
  it('stores only encrypted token/subscription and sets the baseline without queuing old marks',async()=>{
    await register();const device=await new PushStore(env.PUSH_DB!).get(id);
    expect(device?.token_cipher).not.toContain(token);expect(JSON.stringify(device)).not.toContain(subscription.endpoint);
    expect(await unseal(device!.token_cipher!,env.TOKEN_ENCRYPTION_KEY!,`token:${id}`)).toBe(token);
    expect(sqlite.sql.prepare('SELECT * FROM push_seen').all()).toHaveLength(1);
    expect(sqlite.sql.prepare('SELECT * FROM push_outbox').all()).toHaveLength(0);
  });
  it('does not persist invalid tokens or allow another device secret to manage a subscription',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:401})));
    await expect(pushRoute(request(),env)).rejects.toMatchObject({status:401});expect(await new PushStore(env.PUSH_DB!).get(id)).toBeNull();
    await register();await expect(pushRoute(request('DELETE','/api/push/subscription',{...header,'X-Push-Key':base64url(new Uint8Array(32).fill(3))}),env)).rejects.toMatchObject({status:404});
    expect(await new PushStore(env.PUSH_DB!).get(id)).not.toBeNull();
  });
  it('deletes token, baseline and queue on unsubscribe',async()=>{
    await register();await pushRoute(request('DELETE'),env);
    expect(sqlite.sql.prepare('SELECT * FROM push_devices').all()).toHaveLength(0);
    expect(sqlite.sql.prepare('SELECT * FROM push_seen').all()).toHaveLength(0);
  });
  it('prevents overlapping checks and rejects stale leases after token replacement',async()=>{
    await register();const store=new PushStore(env.PUSH_DB!);const old=await store.claim(id,'lease1',instant);
    expect(old).not.toBeNull();expect(await store.claim(id,'lease2',instant)).toBeNull();
    await register();expect(await store.guard(old!)).toBeNull();
    await store.failed(old!,'OLD_TOKEN_FAILURE',instant);expect((await store.get(id))?.last_error).toBeNull();
  });
  it('keeps the baseline when renewing a token for the same child',async()=>{
    await register();await register([{id:'1',value:'4'},{id:'2',value:'5'}]);
    expect(sqlite.sql.prepare('SELECT * FROM push_seen').all()).toHaveLength(1);
  });
  it('retries push errors, sends encrypted VAPID payload and does not repeat delivered marks',async()=>{
    await register();let pushStatus=503;let pushes=0;
    const fetcher=vi.fn().mockImplementation(async(url:string,options:any)=>{
      if(url.startsWith('https://fcm.googleapis.com')){pushes++;expect(options.headers['content-encoding']).toBe('aes128gcm');expect(options.headers.authorization).toMatch(/^vapid t=/);expect(options.redirect).toBe('manual');expect(new TextDecoder().decode(options.body)).not.toContain('Новая оценка');return new Response(null,{status:pushStatus});}
      if(url.includes('/marks/'))return Response.json([{id:'1',value:'4'},{id:'2',value:'5',lesson:'3'}]);
      return Response.json([]);
    });vi.stubGlobal('fetch',fetcher);
    await runPushCron(env);expect(pushes).toBe(1);expect(sqlite.sql.prepare('SELECT * FROM push_outbox').all()).toHaveLength(1);
    instant+=300001;pushStatus=201;await runPushCron(env);expect(pushes).toBe(2);expect(sqlite.sql.prepare('SELECT * FROM push_outbox').all()).toHaveLength(0);
    instant+=300001;await runPushCron(env);expect(pushes).toBe(2);
  });
  it('pauses checks, deletes an expired token and sends one reconnect alert',async()=>{
    await register();let calls=0;
    vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url:string)=>{if(url.includes('/marks/')){calls++;return new Response(null,{status:401});}return new Response(null,{status:201});}));
    await runPushCron(env);const device=await new PushStore(env.PUSH_DB!).get(id);
    expect(device?.state).toBe('token_expired');expect(device?.token_cipher).toBeNull();
    instant+=300001;await runPushCron(env);expect(calls).toBe(1);
  });
  it('removes dead browser subscriptions on HTTP 410',async()=>{
    await register();vi.stubGlobal('fetch',vi.fn().mockImplementation(async(url:string)=>url.includes('/marks/')?Response.json([{id:'1',value:'4'},{id:'2',value:'5'}]):url.startsWith('https://fcm.googleapis.com')?new Response(null,{status:410}):Response.json([])));
    await runPushCron(env);expect(await new PushStore(env.PUSH_DB!).get(id)).toBeNull();expect(sqlite.sql.prepare('SELECT * FROM push_outbox').all()).toHaveLength(0);
  });
  it('rate-limits test notifications',async()=>{
    await register();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:201})));
    await pushRoute(request('POST','/api/push/test'),env);
    await expect(pushRoute(request('POST','/api/push/test'),env)).rejects.toMatchObject({status:429});
  });
});

describe('Background service worker',()=>{
  it('shows a visible notification without opening the app and rejects external click URLs',async()=>{
    const listeners:Record<string,(event:any)=>void>={};
    const shown:any[]=[];const pending:Promise<unknown>[]=[];
    const self={registration:{scope:'https://app.example/dnevnik/',showNotification:async(...args:any[])=>{shown.push(args);}},addEventListener:(name:string,handler:any)=>{listeners[name]=handler;}};
    runInNewContext(readFileSync(new URL('../../public/push-sw.js',import.meta.url),'utf8'),{self,URL});
    listeners.push({data:{json:()=>({title:'Оценка: 5',tag:'grade-1',url:'https://evil.example/collect'})},waitUntil:(promise:Promise<unknown>)=>pending.push(promise)});
    await Promise.all(pending);
    expect(shown[0][0]).toBe('Оценка: 5');expect(shown[0][1].tag).toBe('grade-1');expect(shown[0][1].renotify).toBe(false);
    expect(shown[0][1].data.url).toBe('https://app.example/dnevnik/?tab=grades');
    expect(shown[0][1].icon).toBe('https://app.example/dnevnik/pwa-192x192.png');
  });
});
