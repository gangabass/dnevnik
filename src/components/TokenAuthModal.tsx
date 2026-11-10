import React, { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import type { Connection } from '../services/connectionService';
interface Props {
  initial: Connection | null;
  connected: boolean;
  onClose: () => void;
  onConnect: (connection: Connection, token: string, signal: AbortSignal) => Promise<void>;
  onDisconnect: () => void;
}
export function TokenAuthModal({ initial, connected, onClose, onConnect, onDisconnect }: Props) {
  const [token, setToken] = useState('');
  const [personId, setPersonId] = useState(initial?.personId || '');
  const [schoolId, setSchoolId] = useState(initial?.schoolId || '');
  const [studentName, setStudentName] = useState(initial?.studentName || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => controller.current?.abort(), []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!/^[1-9]\d{0,19}$/.test(personId.trim()) || !/^[1-9]\d{0,19}$/.test(schoolId.trim())) {
      setError('ID ученика и школы должны содержать только цифры.'); return;
    }
    setBusy(true);
    controller.current = new AbortController();
    try {
      await onConnect({ personId: personId.trim(), schoolId: schoolId.trim(), studentName: studentName.trim() }, token.trim(), controller.current.signal);
      onClose();
    } catch (error) {
      if (!controller.current.signal.aborted) setError(error instanceof Error ? error.message : 'Не удалось подключиться.');
    } finally { setBusy(false); }
  }
  const fieldClass = 'w-full mt-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white';
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="token-title">
    <section className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-4"><h2 id="token-title" className="font-bold flex items-center gap-2"><KeyRound size={18} /> Подключение Дневник.ру</h2><button onClick={onClose} aria-label="Закрыть"><X /></button></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">Токен доступа<input className={fieldClass} type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} required disabled={busy} /></label>
        <p className="text-xs text-slate-400">Токен хранится до закрытия вкладки и передаётся серверу для запросов к Дневник.ру.</p>
        <label className="block text-sm">Имя ученика (для отображения)<input className={fieldClass} value={studentName} onChange={event => setStudentName(event.target.value)} disabled={busy} /></label>
        <label className="block text-sm">ID ученика (personId)<input className={fieldClass} inputMode="numeric" value={personId} onChange={event => setPersonId(event.target.value)} required disabled={busy} /></label>
        <label className="block text-sm">ID школы (schoolId)<input className={fieldClass} inputMode="numeric" value={schoolId} onChange={event => setSchoolId(event.target.value)} required disabled={busy} /></label>
        <p className="text-xs text-slate-400">Для родительского токена укажите ID персоны ребёнка. Сохранённые ДЗ доступны без сети на этом устройстве.</p>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-blue-600 py-3 font-semibold disabled:opacity-50">{busy ? 'Проверяем доступ…' : 'Подключить'}</button>
        {connected && <button type="button" disabled={busy} onClick={onDisconnect} className="w-full py-2 text-sm text-red-300">Выйти и удалить сохранённые данные</button>}
      </form>
    </section>
  </div>;
}
