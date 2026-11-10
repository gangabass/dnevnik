import React from 'react';
import { ShieldCheck, Download, Bell, ExternalLink } from 'lucide-react';
import { StudentProfile } from '../types';

interface AndroidHeaderProps {
  student: StudentProfile;
  unreadCount: number;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  isInstallable: boolean;
  onInstall: () => void;
}

export const AndroidHeader: React.FC<AndroidHeaderProps> = ({
  student,
  unreadCount,
  onOpenAuth,
  onOpenNotifications,
  isInstallable,
  onInstall,
}) => {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-4 pt-3 pb-3 shadow-lg border-b border-blue-700/50">
      <div className="flex items-center justify-between gap-3">
        {/* Brand & Region */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-blue-200">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <rect width="100" height="100" rx="20" fill="#1d4ed8" />
              <rect x="22" y="24" width="56" height="52" rx="6" fill="#ffffff" />
              <rect x="28" y="24" width="8" height="52" fill="#bfdbfe" />
              <circle cx="64" cy="62" r="14" fill="#f59e0b" />
              <text x="64" y="69" fontFamily="system-ui" fontSize="18" fontWeight="bold" fill="#fff" textAnchor="middle">5</text>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base tracking-tight leading-none text-white truncate">
                Дневник.ру
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-200 border border-blue-400/30">
                Иркутск
              </span>
            </div>
            <a
              href="https://dnevnik.ru/r/irkutsk/userfeed"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-200/90 hover:text-white flex items-center gap-1 mt-0.5 truncate transition"
              title="Открыть официальный сайт дневника Иркутской области"
            >
              <span className="truncate">dnevnik.ru/r/irkutsk/userfeed</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </a>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* In-App Install Button */}
          {isInstallable && (
            <button
              onClick={onInstall}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md transition active:scale-95 animate-pulse"
              title="Установить Android-приложение на телефон"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Установить</span>
            </button>
          )}

          {/* Notifications Quick Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-blue-950/50 hover:bg-blue-950 text-blue-100 hover:text-white transition active:scale-95 border border-blue-700/50"
            title="Настройки пуш-уведомлений и журнал отметок"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce shadow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Student Profile & Token Status */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-left transition active:scale-95"
            title="Подключение по токену Дневник.ру"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-900 font-bold text-xs shadow shrink-0">
              {student.shortName[0]}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold leading-tight text-white flex items-center gap-1">
                <span className="truncate max-w-[100px]">{student.shortName}</span>
                {student.tokenConnected && (
                  <span title="Подключено по токену">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </span>
                )}
              </div>
              <div className="text-[10px] text-blue-200 leading-none">
                {student.className}
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
