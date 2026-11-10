import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, KeyRound } from 'lucide-react';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidHeader } from './components/AndroidHeader';
import { AndroidBottomNav, type TabType } from './components/AndroidBottomNav';
import { HomeworkView } from './components/HomeworkView';
import { TokenAuthModal } from './components/TokenAuthModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { getHomework, getProfile } from './services/apiService';
import { connectionService, type Connection, type HomeworkCache } from './services/connectionService';
import type { HomeworkItem, StudentProfile } from './types';
import { usePWAInstall } from './hooks/usePWAInstall';

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function initialRange() {
  const start = new Date();
  const end = new Date(start); end.setDate(end.getDate() + 7);
  return { start: localDate(start), end: localDate(end) };
}
function mergeCompletion(items: HomeworkItem[], previous: HomeworkItem[]) {
  const completed = new Set(previous.filter(item => item.isCompleted).map(item => item.id));
  return items.map(item => ({ ...item, isCompleted: completed.has(item.id) }));
}
export default function App() {
  const [connection, setConnection] = useState(() => connectionService.getSettings());
  const [token, setToken] = useState(() => connectionService.getToken());
  const [cache, setCache] = useState<HomeworkCache | null>(() => {
    const settings = connectionService.getSettings();
    return settings ? connectionService.readCache(settings) : null;
  });
  const [range, setRange] = useState(initialRange);
  const [accountName, setAccountName] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('homework');
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const requestRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const { isInstallable, install } = usePWAInstall();

  // The token stays in this tab's sessionStorage. Homework is cached per child/school.
  useEffect(() => {
    if (!connection || !token) return;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setBusy(true); setError('');
    (async () => {
      try {
        const profile = await getProfile(token, controller.signal);
        const result = await getHomework(token, connection.personId, connection.schoolId, range.start, range.end, controller.signal);
        if (controller.signal.aborted) return;
        const next: HomeworkCache = {
          homework: mergeCompletion(result.homework, cacheRef.current?.homework || []),
          updatedAt: new Date().toISOString(), startDate: range.start, endDate: range.end,
        };
        connectionService.saveCache(connection, next);
        setCache(next); setAccountName(profile.profile.name);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Ошибка загрузки.');
      } finally { if (!controller.signal.aborted) setBusy(false); }
    })();
    return () => controller.abort();
    // Dates are applied with the explicit Refresh button.
  }, [refresh]);

  async function connect(nextConnection: Connection, nextToken: string, signal: AbortSignal) {
    requestRef.current?.abort(); setBusy(false);
    const profile = await getProfile(nextToken, signal);
    const result = await getHomework(nextToken, nextConnection.personId, nextConnection.schoolId, range.start, range.end, signal);
    if (signal.aborted) return;
    const saved = connectionService.readCache(nextConnection);
    const nextCache: HomeworkCache = {
      homework: mergeCompletion(result.homework, saved?.homework || []),
      updatedAt: new Date().toISOString(), startDate: range.start, endDate: range.end,
    };
    connectionService.saveSettings(nextConnection);
    connectionService.saveToken(nextToken);
    connectionService.saveCache(nextConnection, nextCache);
    setConnection(nextConnection); setToken(nextToken); setCache(nextCache);
    setAccountName(profile.profile.name); setError(''); setActiveTab('homework');
  }
  function disconnect() {
    requestRef.current?.abort();
    connectionService.disconnect();
    setConnection(null); setToken(''); setCache(null); setAccountName('');
    setError(''); setBusy(false); setAuthOpen(false);
  }
  function toggleHomework(id: string) {
    if (!connection) return;
    setCache(previous => {
      if (!previous) return previous;
      const next = { ...previous, homework: previous.homework.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item) };
      connectionService.saveCache(connection, next);
      return next;
    });
  }
  const student: StudentProfile = {
    id: connection?.personId || '', fullName: connection?.studentName || 'Ученик',
    shortName: connection?.studentName || 'Дневник', schoolName: '', schoolRegion: '',
    className: connection ? `Школа ${connection.schoolId}` : 'Подключите аккаунт',
    tokenConnected: !!token && !error, currentQuarter: 0, gpa: 0,
  };
  const homework = cache?.homework || [];
  const inputClass = 'min-w-0 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm';
  return <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
    <div className="w-full max-w-md min-h-screen flex flex-col relative border-x border-slate-800/80">
      <AndroidStatusBar unreadCount={0} />
      <AndroidHeader student={student} unreadCount={0} onOpenAuth={() => setAuthOpen(true)} onOpenNotifications={() => setActiveTab('push')} isInstallable={isInstallable} onInstall={install} />
      <main className="flex-1 px-4 pt-3 pb-24">
        <PWAInstallBanner />
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-semibold text-sm">{connection ? connection.studentName || `Ученик ${connection.personId}` : 'Ваш дневник'}</h1>
            <button onClick={() => setAuthOpen(true)} className="text-xs text-blue-300 flex items-center gap-1"><KeyRound size={14} /> {token ? 'Подключение' : 'Ввести токен'}</button>
          </div>
          {accountName && <p className="text-xs text-slate-400">Аккаунт: {accountName}</p>}
          {!connection && <p className="text-sm text-slate-400">Введите токен Дневник.ру и укажите ученика и школу, чтобы загрузить домашние задания.</p>}
          {connection && <>
            {!token && <p className="text-xs text-amber-300">Для обновления данных введите токен. Сохранённые задания доступны без него.</p>}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">С даты<input aria-label="Начало периода" type="date" className={inputClass} value={range.start} onChange={event => setRange({ ...range, start: event.target.value })} /></label>
              <label className="text-xs text-slate-400">По дату<input aria-label="Конец периода" type="date" className={inputClass} value={range.end} onChange={event => setRange({ ...range, end: event.target.value })} /></label>
            </div>
            <button disabled={busy || !token || !range.start || !range.end || range.start > range.end} onClick={() => setRefresh(value => value + 1)} className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} />{busy ? 'Загружаем…' : 'Обновить задания'}</button>
          </>}
          {error && <p role="alert" className="text-sm text-red-300">{error}{error.includes('Токен') && <button className="block mt-2 underline" onClick={() => setAuthOpen(true)}>Ввести новый токен</button>}</p>}
          {cache && <p className="text-xs text-slate-400">Сохранены ДЗ за {cache.startDate} — {cache.endDate}. Обновлено: {new Date(cache.updatedAt).toLocaleString('ru-RU')}. Отметки выполнения хранятся на этом устройстве.</p>}
        </section>
        {activeTab === 'homework' && connection && <HomeworkView homework={homework} onToggleHomework={toggleHomework} />}
        {activeTab !== 'homework' && <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-400">
          {{ feed: 'Лента пока не подключена к API.', grades: 'Оценки пока не подключены к API.', schedule: 'Расписание пока не подключено к API.', push: 'Фоновые уведомления пока не подключены. Домашние задания обновляются кнопкой «Обновить задания».' }[activeTab]}
        </section>}
      </main>
      <AndroidBottomNav currentTab={activeTab} onChangeTab={setActiveTab} unreadFeedCount={0} pendingHwCount={homework.filter(item => !item.isCompleted).length} gpa={0} />
      <OfflineIndicator />
      {authOpen && <TokenAuthModal initial={connection} connected={!!connection} onClose={() => setAuthOpen(false)} onConnect={connect} onDisconnect={disconnect} />}
    </div>
  </div>;
}
