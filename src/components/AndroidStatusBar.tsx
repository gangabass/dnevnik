import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Bell } from 'lucide-react';

interface AndroidStatusBarProps {
  unreadCount?: number;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({ unreadCount = 0 }) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      // Irkutsk time is UTC+8
      const now = new Date();
      const irkutskTime = new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Asia/Irkutsk',
        hour: '2-digit',
        minute: '2-digit',
      }).format(now);
      setTimeStr(irkutskTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-950/90 backdrop-blur-md px-4 py-1 text-slate-300 text-xs flex items-center justify-between border-b border-slate-800/60 sticky top-0 z-40 select-none">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-100 font-mono tracking-tight">{timeStr || '14:45'}</span>
        <span className="text-[10px] text-blue-400 font-medium px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/40">
          Иркутск UTC+8
        </span>
        {unreadCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium ml-1">
            <Bell className="w-3 h-3 fill-amber-400" />
            <span>{unreadCount}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-[10px] font-bold text-slate-300">5G</span>
        <Wifi className="w-3.5 h-3.5 text-slate-300" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-slate-300">89%</span>
          <BatteryMedium className="w-4 h-4 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};
