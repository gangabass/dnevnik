import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, KeyRound } from 'lucide-react';
import { AndroidHeader } from './components/AndroidHeader';
import { AndroidBottomNav, type TabType } from './components/AndroidBottomNav';
import { HomeworkView } from './components/HomeworkView';
import { TokenAuthModal } from './components/TokenAuthModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LiveGradesView } from './components/LiveGradesView';
import { LiveScheduleView } from './components/LiveScheduleView';
import { DiaryFeedView } from './components/DiaryFeedView';
import { feedItems } from './services/feedService';
import { BackgroundPushSettings } from './components/BackgroundPushSettings';
import { disableBackgroundPush, hasPushDevice, hasBackgroundPush, renewBackgroundPush } from './services/backgroundPush';
import { LiveSettingsView } from './components/LiveSettingsView';
import { average, mergeDiary, newMarks } from './services/diaryService';
import { loadLiveOptions, saveLiveOptions, notifyNewMarks } from './services/liveNotifications';
import type { DiaryWarning } from '../shared/diary';
import { getDiary, getProfile } from './services/apiService';
import { connectionService, type Connection, type HomeworkCache } from './services/connectionService';
import type { StudentProfile } from './types';
import { usePWAInstall } from './hooks/usePWAInstall';

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function initialRange() {
  const start = new Date(); start.setDate(start.getDate() - 14);
  const end = new Date(); end.setDate(end.getDate() + 7);
  return { start: localDate(start), end: localDate(end) };
}
export default function App() {
  const [connection, setConnection] = useState(() => connectionService.getSettings());
  const [token, setToken] = useState(() => connectionService.getToken());
  const [cache, setCache] = useState<HomeworkCache | null>(() => {
    const settings = connectionService.getSettings();
    return settings ? connectionService.readCache(settings) : null;
  });
  const [range, setRange] = useState(initialRange);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [accountName, setAccountName] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>(() => { const tab = new URLSearchParams(window.location.search).get('tab'); return ['feed','grades','homework','schedule','push'].includes(tab || '') ? tab as TabType : 'homework'; });
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [warnings, setWarnings] = useState<DiaryWarning[]>([]);
  const [options, setOptions] = useState(loadLiveOptions);
  const optionsRef = useRef(options); optionsRef.current = options;
  const busyRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const { isInstallable, install } = usePWAInstall();

  // Restore the saved connection on launch. Homework is cached per child/school.
  useEffect(() => {
    if (!connection || !token) return;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setBusy(true); busyRef.current = true; setError('');
    (async () => {
      try {
        const profile = await getProfile(token, controller.signal);
        const result = await getDiary(token, connection.personId, connection.schoolId, appliedRange.start, appliedRange.end, controller.signal);
        if (controller.signal.aborted) return;
        const additions = newMarks(result, cacheRef.current);
        const next = mergeDiary(result, cacheRef.current, appliedRange.start, appliedRange.end);
        setWarnings(result.warnings);
        connectionService.saveCache(connection, next);
        setCache(next); setAccountName(profile.profile.name);
        if (optionsRef.current.notifications && !hasBackgroundPush() && document.visibilityState === 'visible' && additions.length) {
          void notifyNewMarks(additions).catch(() => {});
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Ошибка загрузки.');
      } finally { if (!controller.signal.aborted) { setBusy(false); busyRef.current = false; } }
    })();
    return () => controller.abort();
    // Dates are applied with the explicit Refresh button.
  }, [refresh]);

  useEffect(() => {
    if (!options.autoRefresh || !token || !connection) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && !busyRef.current) setRefresh(value => value + 1);
    };
    const interval = window.setInterval(refreshIfVisible, options.intervalMinutes * 60000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshIfVisible); };
  }, [options.autoRefresh, options.intervalMinutes, token, connection]);

  async function connect(nextConnection: Connection, nextToken: string, signal: AbortSignal) {
    requestRef.current?.abort(); setBusy(true); busyRef.current = true;
    try {
      const profile = await getProfile(nextToken, signal);
      const result = await getDiary(nextToken, nextConnection.personId, nextConnection.schoolId, range.start, range.end, signal);
      if (signal.aborted) return;
      if (result.homework === null && result.grades === null && result.schedule === null) throw new Error(result.warnings[0]?.message || 'Нет доступа к данным ученика.');
      const saved = connectionService.readCache(nextConnection);
      const nextCache = mergeDiary(result, saved, range.start, range.end);
      connectionService.saveSettings(nextConnection);
      connectionService.saveToken(nextToken);
      connectionService.saveCache(nextConnection, nextCache);
      setAppliedRange(range);
      setConnection(nextConnection); setToken(nextToken); setCache(nextCache);
      setAccountName(profile.profile.name); setError(''); setWarnings(result.warnings); setActiveTab('homework');
      if (hasPushDevice()) {
        try { await renewBackgroundPush(nextToken,nextConnection); }
        catch { setError('Дневник подключён, но фоновую подписку не удалось обновить. Проверьте раздел настроек.'); }
      }
    } finally { setBusy(false); busyRef.current = false; }
  }

  async function disconnect() {
    if (hasPushDevice()) await disableBackgroundPush();
    requestRef.current?.abort();
    connectionService.disconnect();
    setOptions(loadLiveOptions());
    setConnection(null); setToken(''); setCache(null); setAccountName('');
    setError(''); setWarnings([]); setBusy(false); busyRef.current = false; setAuthOpen(false);
  }
  function toggleHomework(id: string) {
    if (!connection) return;
    setCache(previous => {
      if (!previous) return previous;
      const completedIds = new Set(previous.completedIds || previous.homework.filter(item => item.isCompleted).map(item => item.id));
      if (completedIds.has(id)) completedIds.delete(id); else completedIds.add(id);
      const next = { ...previous, completedIds: [...completedIds], homework: previous.homework.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item) };
      connectionService.saveCache(connection, next);
      return next;
    });
  }
  const student: StudentProfile = {
    id: connection?.personId || '', fullName: connection?.studentName || 'Ученик',
    shortName: connection?.studentName || 'Дневник', schoolName: cache?.student?.schoolName || connection?.schoolName || '', schoolRegion: '',
    className: cache?.student?.className || connection?.className || (connection ? `Школа ${connection.schoolId}` : 'Подключите аккаунт'),
    tokenConnected: !!token && !error, currentQuarter: 0, gpa: 0,
  };
  const homework = cache?.homework || [];
  const grades = cache?.grades || [];
  const gpa = average(grades) || 0;
  const unreadFeedCount = feedItems(grades).filter(item => !cache?.readFeedIds?.includes(item.id)).length;
  function markFeedRead(ids: string[]) {
    if (!cache || !connection) return;
    const next = { ...cache, readFeedIds: [...new Set([...(cache.readFeedIds || []), ...ids])].slice(-3000) };
    setCache(next); connectionService.saveCache(connection, next);
  }
  const inputClass = 'min-w-0 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm';
  return <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center">
    <div className="w-full max-w-md min-h-screen flex flex-col relative border-x border-slate-800/80">
      <AndroidHeader student={student} unreadCount={unreadFeedCount} onOpenAuth={() => setAuthOpen(true)} onOpenNotifications={() => setActiveTab('push')} isInstallable={isInstallable} onInstall={install} />
      <main className="flex-1 px-4 pt-3 pb-24">
        <PWAInstallBanner />
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-semibold text-sm">{connection ? connection.studentName || `Ученик ${connection.personId}` : 'Ваш дневник'}</h1>
            <button onClick={() => setAuthOpen(true)} className="text-xs text-blue-300 flex items-center gap-1"><KeyRound size={14} /> {token ? 'Подключение' : 'Ввести токен'}</button>
          </div>
          {student.schoolName && <p className="text-xs text-slate-400">{student.schoolName} · {student.className}</p>}
          {accountName && <p className="text-xs text-slate-400">Аккаунт: {accountName}</p>}
          {!connection && <p className="text-sm text-slate-400">Введите токен Дневник.ру и укажите ученика и школу, чтобы загрузить оценки, расписание и домашние задания.</p>}
          {connection && <>
            {!token && <p className="text-xs text-amber-300">Для обновления данных введите токен. Сохранённые данные доступны без него.</p>}
            {activeTab !== 'grades' && <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">С даты<input aria-label="Начало периода" type="date" className={inputClass} value={range.start} onChange={event => setRange({ ...range, start: event.target.value })} /></label>
              <label className="text-xs text-slate-400">По дату<input aria-label="Конец периода" type="date" className={inputClass} value={range.end} onChange={event => setRange({ ...range, end: event.target.value })} /></label>
            </div>}
            <button disabled={busy || !token || !range.start || !range.end || range.start > range.end} onClick={() => { setAppliedRange(range); setRefresh(value => value + 1); }} className="w-full flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-2 text-sm disabled:opacity-50"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} />{busy ? 'Загружаем…' : 'Обновить дневник'}</button>
          </>}
          {error && <p role="alert" className="text-sm text-red-300">{error}{error.includes('Токен') && <button className="block mt-2 underline" onClick={() => setAuthOpen(true)}>Ввести новый токен</button>}</p>}
          {warnings.length > 0 && <div role="status" className="text-xs text-amber-300 space-y-1">{warnings.map((warning, index) => <p key={index}>{{ homework: 'ДЗ', grades: 'Оценки', schedule: 'Расписание', profile: 'Школа' }[warning.section]}: {warning.message} Если раздел не обновился, показаны ранее сохранённые данные.</p>)}</div>}
          {cache && activeTab !== 'grades' && <div className="text-xs text-slate-500 space-y-1">{(['homework', 'grades', 'schedule'] as const).map(section => { const stamp = cache.sectionDates?.[section]; return stamp && <p key={section}>{{ homework: 'ДЗ', grades: 'Оценки', schedule: 'Расписание' }[section]}: {stamp.start} — {stamp.end} · {new Date(stamp.updatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>; })}<p>Отметки выполнения ДЗ хранятся на этом устройстве.</p></div>}

        </section>
        {activeTab === 'homework' && connection && <HomeworkView homework={homework} onToggleHomework={toggleHomework} />}
        {activeTab === 'grades' && <LiveGradesView token={token} connection={connection} refresh={refresh} />}
        {activeTab === 'schedule' && <LiveScheduleView days={cache?.schedule || []} startDate={cache?.sectionDates?.schedule?.start || cache?.startDate} endDate={cache?.sectionDates?.schedule?.end || cache?.endDate} />}
        {activeTab === 'feed' && <DiaryFeedView grades={grades} token={token} readIds={cache?.readFeedIds || []} onRead={markFeedRead} />}
        {activeTab === 'push' && <div className="space-y-4"><BackgroundPushSettings token={token} connection={connection} onEnabled={() => { const next={...options,notifications:false};setOptions(next);saveLiveOptions(next); }} /><LiveSettingsView options={options} onChange={next => { setOptions(next); saveLiveOptions(next); }} onOpenAuth={() => setAuthOpen(true)} /></div>}

      </main>
      <AndroidBottomNav currentTab={activeTab} onChangeTab={setActiveTab} unreadFeedCount={unreadFeedCount} pendingHwCount={homework.filter(item => !item.isCompleted).length} gpa={gpa} />
      <OfflineIndicator />
      {authOpen && <TokenAuthModal initial={connection} connected={!!connection} onClose={() => setAuthOpen(false)} onConnect={connect} onDisconnect={disconnect} />}
    </div>
  </div>;
}
