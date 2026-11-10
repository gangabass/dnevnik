import { apiRequest } from './apiService';
import type { Connection } from './connectionService';
const KEY = 'dnevnik_background_push_v1';
interface LocalDevice { id: string; secret: string; enabled: boolean }
export interface BackgroundStatus {
  ok: true; enabled: boolean; state: string; personId?: string; schoolId?: string;
  lastCheckAt?: number | null; lastSuccessAt?: number | null; lastPushAt?: number | null; lastError?: string | null; pending?: number;
}
function localDevice(): LocalDevice | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function persist(device: LocalDevice) { localStorage.setItem(KEY, JSON.stringify(device)); }
function headers(device: LocalDevice): Record<string,string> { return { 'X-Push-Device': device.id, 'X-Push-Key': device.secret }; }
function newDevice(): LocalDevice {
  const secret = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return { id: crypto.randomUUID(), secret, enabled: false };
}
function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/') + '='.repeat((4-value.length%4)%4)), char => char.charCodeAt(0));
}
export function hasBackgroundPush(): boolean { return localDevice()?.enabled === true; }
export function hasPushDevice(): boolean { return !!localDevice(); }
export function backgroundConfig() {
  return apiRequest<{ ok:true; configured:boolean; publicKey:string | null; intervalMinutes:number }>('/api/push/config');
}
export async function backgroundStatus(): Promise<BackgroundStatus> {
  const device = localDevice();
  if (!device) return {ok:true,enabled:false,state:'disabled'};
  const status = await apiRequest<BackgroundStatus>('/api/push/subscription',{headers:headers(device)});
  persist({...device,enabled:status.enabled && status.state === 'active'});
  return status;
}
async function registration(): Promise<ServiceWorkerRegistration> {
  const ready = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (ready?.active) return ready;
  return Promise.race([navigator.serviceWorker.ready, new Promise<never>((_,reject) => setTimeout(() => reject(new Error('Перезагрузите PWA для установки обработчика уведомлений.')),10000))]);
}
async function saveSubscription(token: string, connection: Connection, subscription: PushSubscription, device: LocalDevice) {
  await apiRequest('/api/push/subscription', { method:'POST', headers:{...headers(device),Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({personId:connection.personId,schoolId:connection.schoolId,studentName:connection.studentName,subscription:subscription.toJSON()}) });
  persist({...device,enabled:true});
}
export async function enableBackgroundPush(token: string, connection: Connection): Promise<void> {
  if (!token) throw new Error('Введите токен в подключении, затем включите уведомления.');
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Web Push недоступен. На iPhone добавьте приложение на главный экран.');
  // Permission is requested directly from the user's button click (required on iOS).
  if (await Notification.requestPermission() !== 'granted') throw new Error('Разрешите уведомления в настройках браузера.');
  const config = await backgroundConfig();
  if (!config.configured || !config.publicKey) throw new Error('Сначала настройте фоновые уведомления на сервере.');
  const remembered = localDevice();
  const device = remembered || newDevice(); persist(device);
  const reg = await registration();
  let subscription = await reg.pushManager.getSubscription();
  if (subscription && !remembered) { await subscription.unsubscribe(); subscription = null; }
  if (subscription && subscription.options.applicationServerKey) {
    const expected = decodeKey(config.publicKey);
    const actual = new Uint8Array(subscription.options.applicationServerKey);
    if (expected.length !== actual.length || expected.some((value,index) => value !== actual[index])) {
      await subscription.unsubscribe(); subscription = null;
    }
  }
  if (!subscription) subscription = await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(config.publicKey)});
  await saveSubscription(token,connection,subscription,device);
}
export async function renewBackgroundPush(token: string, connection: Connection) {
  const device = localDevice(); if (!device) return;
  const reg = await registration(); const subscription = await reg.pushManager.getSubscription();
  if (!subscription) { persist({...device,enabled:false}); throw new Error('Браузерная подписка истекла. Включите фоновые уведомления заново.'); }
  await saveSubscription(token,connection,subscription,device);
}
export async function disableBackgroundPush() {
  const device = localDevice();
  // Delete the server token before forgetting the device-management key.
  if (device) await apiRequest('/api/push/subscription',{method:'DELETE',headers:headers(device)});
  localStorage.removeItem(KEY);
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
    try { await reg?.pushManager.getSubscription().then(subscription => subscription?.unsubscribe()); } catch { /* The server token has already been deleted. */ }
  }
}
export async function testBackgroundPush() {
  const device = localDevice(); if (!device) throw new Error('Сначала включите фоновые уведомления.');
  await apiRequest('/api/push/test',{method:'POST',headers:headers(device)});
}
