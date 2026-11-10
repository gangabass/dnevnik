import React, { useState } from 'react';
import type { LiveOptions } from '../services/liveNotifications';
export function LiveSettingsView({ options, onChange, onOpenAuth }: { options: LiveOptions; onChange: (options: LiveOptions) => void; onOpenAuth: () => void }) {
  const [message, setMessage] = useState('');
  async function notifications(enabled: boolean) {
    if (!enabled) { onChange({ ...options, notifications: false }); return; }
    if (!('Notification' in window)) { setMessage('Этот браузер не поддерживает уведомления.'); return; }
    try {
      const permission = await Notification.requestPermission();
      onChange({ ...options, notifications: permission === 'granted' });
      setMessage(permission === 'granted' ? 'Уведомления о новых оценках включены.' : 'Разрешите уведомления в настройках браузера.');
    } catch { setMessage('Не удалось запросить разрешение.'); }
  }
  return <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"><h2 className="font-bold">Обновление и уведомления</h2><label className="flex gap-3 text-sm"><input type="checkbox" checked={options.autoRefresh} onChange={event => onChange({ ...options, autoRefresh: event.target.checked })} />Обновлять данные автоматически</label><label className="block text-sm">Интервал<select className="block w-full rounded-xl border border-slate-700 bg-slate-950 p-2 mt-2" value={options.intervalMinutes} onChange={event => onChange({ ...options, intervalMinutes: Number(event.target.value) })}>{[1,5,15,30].map(value => <option key={value} value={value}>{value} мин.</option>)}</select></label><label className="flex gap-3 text-sm"><input type="checkbox" checked={options.notifications} onChange={event => void notifications(event.target.checked)} />Уведомлять только при открытом приложении</label><p className="text-xs text-slate-400">Автообновление работает, пока приложение открыто и видно на экране. Для доставки после закрытия включите фоновые уведомления выше. Первая загрузка не уведомляет о старых оценках.</p>{message && <p role="status" className="text-xs text-blue-300">{message}</p>}<button onClick={onOpenAuth} className="text-sm text-blue-300 underline">Токен и выбор ученика</button></section>;
}
