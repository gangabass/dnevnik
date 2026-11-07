import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If running in standalone mode, suppress the prompt
  if (isInstalled || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Ambient Banner at bottom or top of content */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 border border-blue-700/60 rounded-3xl p-3.5 shadow-xl text-white mb-4 flex items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
            <svg viewBox="0 0 40 40" className="w-full h-full">
              <rect width="40" height="40" rx="8" fill="#1d4ed8" />
              <text x="20" y="27" fontFamily="system-ui" fontSize="20" fontWeight="bold" fill="#fff" textAnchor="middle">5</text>
            </svg>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs leading-tight truncate">
              Установить приложение Дневник.ру
            </h4>
            <p className="text-[11px] text-blue-200 truncate mt-0.5">
              Моментальные пуш-уведомления и оффлайн-доступ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <button
              onClick={install}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Установить</span>
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition active:scale-95"
            >
              Инструкция
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-full hover:bg-white/10 text-blue-200 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guide modal for Android & iOS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm text-white">
                  Как установить на телефон
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  На Android (Chrome, Яндекс Браузер):
                </div>
                <p className="text-[11px] text-slate-400 pl-6">
                  Нажмите на значок меню (три точки <span className="font-bold text-white">⋮</span> в правом верхнем углу) и выберите <span className="font-semibold text-blue-400">«Установить приложение»</span> или «Добавить на главный экран».
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  На iPhone / iPad (Safari):
                </div>
                <p className="text-[11px] text-slate-400 pl-6">
                  Нажмите кнопку <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> «Поделиться» внизу экрана, пролистайте вниз и выберите <span className="font-semibold text-blue-400">«На экран "Домой"»</span>.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Приложение будет работать как нативное: с иконкой, push-уведомлениями и оффлайн-кэшем.</span>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition active:scale-95 shadow-md"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
};
