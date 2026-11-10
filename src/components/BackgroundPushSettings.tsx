import React, { useEffect, useState } from 'react';
import type { Connection } from '../services/connectionService';
import { backgroundConfig, backgroundStatus, enableBackgroundPush, disableBackgroundPush, testBackgroundPush, type BackgroundStatus } from '../services/backgroundPush';
const errors: Record<string,string> = { API_RATE_LIMIT:'Дневник.ру ограничил частоту запросов. Повторим позже.', API_UNAVAILABLE:'Дневник.ру временно недоступен. Проверка повторится.', PUSH_AUTH_FAILED:'Сервер не смог авторизовать отправку. Нужна проверка серверных ключей.', PUSH_RETRY:'Отправка не удалась. Повторим автоматически.', TOKEN_DECRYPTION_FAILED:'Не удалось прочитать сохранённый токен. Обновите подключение.', SUBSCRIPTION_DECRYPTION_FAILED:'Не удалось прочитать подписку. Включите её заново.', token_expired:'Обновите токен Дневник.ру.', access_denied:'Проверьте доступ к оценкам ученика.' };
const date = (value?:number|null) => value ? new Date(value).toLocaleString('ru-RU') : 'ещё не было';
export function BackgroundPushSettings({token,connection,onEnabled}:{token:string;connection:Connection|null;onEnabled:()=>void}) {
  const [status,setStatus] = useState<BackgroundStatus|null>(null);
  const [configured,setConfigured] = useState<boolean|null>(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function reload() {
    const [config,state] = await Promise.all([backgroundConfig(),backgroundStatus()]);
    setConfigured(config.configured); setStatus(state);
  }
  useEffect(() => { let active=true; Promise.all([backgroundConfig(),backgroundStatus()]).then(([config,state])=>{if(active){setConfigured(config.configured);setStatus(state);}}).catch(()=>{if(active)setMessage('Не удалось проверить серверную подписку.');}); return ()=>{active=false;}; },[connection?.personId,connection?.schoolId]);
  async function action(kind:'enable'|'disable'|'test'|'reload') {
    setBusy(true); setMessage('');
    try {
      if(kind==='enable') { if(!connection)throw new Error('Сначала подключите ученика.');await enableBackgroundPush(token,connection);onEnabled();setMessage('Включено. Оценки проверяются каждые 5 минут, даже при закрытой PWA.'); }
      if(kind==='disable') {await disableBackgroundPush();setMessage('Подписка и серверный токен удалены.');}
      if(kind==='test') {await testBackgroundPush();setMessage('Тест принят push-сервисом. Проверьте уведомления телефона.');}
      await reload();
    } catch(error){setMessage(error instanceof Error?error.message:'Не удалось выполнить действие.');}
    finally{setBusy(false);}
  }
  const active = status?.enabled && status.state === 'active';
  const stateLabel = status?.state === 'token_expired' ? 'Токен истёк — обновите подключение' : status?.state === 'access_denied' ? 'Доступ к оценкам закрыт' : active ? 'Включены, проверка каждые 5 минут' : 'Выключены';
  const wrongStudent = active && connection && (connection.personId!==status.personId || connection.schoolId!==status.schoolId);
  return <section className="space-y-3 rounded-2xl border border-blue-800 bg-slate-900 p-4"><h2 className="font-bold">Фоновые уведомления</h2><p className="text-sm text-blue-200">{stateLabel}</p><p className="text-xs text-slate-400">Работают и при закрытом приложении. При включении токен Дневник.ру сохраняется на сервере в зашифрованном виде. При отключении токен и подписка удаляются. Уведомления могут задерживаться из-за сети и настроек телефона.</p>{configured===false&&<p className="text-xs text-amber-300">На сервере ещё не настроены D1 или ключи Web Push.</p>}{wrongStudent&&<p className="text-xs text-amber-300">Подписка настроена на другого ученика. Обновите её кнопкой ниже.</p>}
    {status?.enabled&&<div className="text-xs text-slate-400 space-y-1">{(status.pending || 0)>0&&<p>Ожидают отправки: {status.pending}</p>}<p>Последняя проверка: {date(status.lastCheckAt)}</p><p>Успешная проверка: {date(status.lastSuccessAt)}</p><p>Принято push-сервисом: {date(status.lastPushAt)}</p>{status.lastError&&<p className="text-amber-300">{errors[status.lastError] || 'Произошла ошибка. Сервер повторит проверку.'}</p>}</div>}
    <div className="flex flex-wrap gap-2"><button disabled={busy||!configured||!connection||!token} onClick={()=>void action('enable')} className="rounded-xl bg-blue-600 px-3 py-2 text-sm disabled:opacity-50">{active?'Обновить токен / ученика':'Включить фоновые уведомления'}</button>{status?.enabled&&<><button disabled={busy} onClick={()=>void action('test')} className="rounded-xl border border-slate-700 px-3 py-2 text-sm">Тест</button><button disabled={busy} onClick={()=>void action('disable')} className="rounded-xl border border-red-900 px-3 py-2 text-sm text-red-300">Отключить</button></>}<button disabled={busy} onClick={()=>void action('reload')} className="text-xs text-slate-400 underline">Проверить состояние</button></div>
    {!token&&<p className="text-xs text-slate-400">Для включения или обновления введите токен. Отключение доступно без токена.</p>}{message&&<p role="status" className="text-xs text-blue-200">{message}</p>}
  </section>;
}
