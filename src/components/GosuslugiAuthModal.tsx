import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Smartphone, KeyRound, CheckCircle2, User, School, Sparkles } from 'lucide-react';
import { StudentProfile } from '../types';

interface GosuslugiAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: StudentProfile;
  onSelectStudent: (student: StudentProfile) => void;
}

export const GosuslugiAuthModal: React.FC<GosuslugiAuthModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  onSelectStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'esia_form' | 'presets'>('status');
  const [loginInput, setLoginInput] = useState('+7 (902) 512-44-89');
  const [passwordInput, setPasswordInput] = useState('••••••••••••');
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  if (!isOpen) return null;

  const handleSimulateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessToast(true);
      setTimeout(() => {
        setSuccessToast(false);
        onClose();
      }, 1200);
    }, 900);
  };

  const handleSelectPreset = (preset: StudentProfile) => {
    onSelectStudent(preset);
    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 800);
  };

  const PRESET_PROFILES: StudentProfile[] = [
    {
      id: 'irk-student-98234',
      fullName: 'Смирнов Артём Максимович',
      shortName: 'Артём Смирнов',
      schoolName: 'МБОУ г. Иркутска СОШ №14',
      schoolRegion: 'Иркутская область',
      className: '9 «А» класс',
      currentQuarter: 3,
      gpa: 4.58,
      esiaConnected: true,
      esiaUserId: '100-349-812 04',
    },
    {
      id: 'irk-student-11029',
      fullName: 'Новикова Полина Денисовна',
      shortName: 'Полина Новикова',
      schoolName: 'МАОУ Гимназия №25 г. Иркутска',
      schoolRegion: 'Иркутская область',
      className: '11 «Б» класс',
      currentQuarter: 3,
      gpa: 4.88,
      esiaConnected: true,
      esiaUserId: '144-892-301 92',
    },
    {
      id: 'irk-parent-00213',
      fullName: 'Смирнова Елена Сергеевна (Родитель)',
      shortName: 'Елена Смирнова',
      schoolName: 'МБОУ г. Иркутска СОШ №14',
      schoolRegion: 'Иркутская область',
      className: 'Родительский доступ (9 «А»)',
      currentQuarter: 3,
      gpa: 4.58,
      esiaConnected: true,
      esiaUserId: '078-439-551 18',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 relative">
        {/* Gosuslugi brand top banner */}
        <div className="bg-gradient-to-r from-[#0055b8] to-[#0b6ad8] p-4 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <path d="M5 20 Q 20 5 35 20 Q 20 35 5 20 Z" fill="#0055b8" />
                <circle cx="20" cy="20" r="7" fill="#ee3124" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                <span>ГОСУСЛУГИ</span>
                <span className="text-[10px] bg-red-500 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                  ЕСИА
                </span>
              </div>
              <div className="text-[11px] text-blue-100">
                Единая система идентификации и аутентификации
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'status'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Текущий статус
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'presets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Выбрать профиль
          </button>
          <button
            onClick={() => setActiveTab('esia_form')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
              activeTab === 'esia_form'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Вход через ЕСИА
          </button>
        </div>

        <div className="p-5 space-y-4">
          {successToast && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Авторизация через Госуслуги Иркутской области успешна!</span>
            </div>
          )}

          {/* TAB 1: Status */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                      {currentStudent.shortName[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        {currentStudent.fullName}
                      </div>
                      <div className="text-xs text-blue-400 font-medium">
                        {currentStudent.className}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {currentStudent.schoolName}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-900/80">
                    <span className="text-[10px] text-slate-400 block">СНИЛС / ЕСИА ID</span>
                    <span className="font-mono text-slate-200 font-medium">
                      {currentStudent.esiaUserId || '100-349-812 04'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80">
                    <span className="text-[10px] text-slate-400 block">Статус Госуслуг</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Подтверждена
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-200 space-y-1.5">
                <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Шлюз дневника Иркутской области
                </div>
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                  Приложение синхронизировано с <span className="text-blue-300 underline">dnevnik.ru/r/irkutsk/userfeed</span>. Авторизация ЕСИА обеспечивает автоматическую доставку отметок и ДЗ через защищенный API дневника.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('presets')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md transition active:scale-95"
                >
                  Сменить профиль / ученика
                </button>
                <button
                  onClick={onClose}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-300 transition"
                >
                  Закрыть
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Выберите тестовый профиль ученика или родителя школ Иркутска для быстрой проверки:
              </p>

              <div className="space-y-2">
                {PRESET_PROFILES.map((p) => {
                  const isCurrent = p.id === currentStudent.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-blue-950/70 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center font-bold text-sm text-blue-300 shrink-0">
                          {p.shortName[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                            <span>{p.fullName}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded font-normal">
                                Активен
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-blue-400 font-medium">
                            {p.className} • Средний балл: {p.gpa}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {p.schoolName}
                          </div>
                        </div>
                      </div>

                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ESIA Form */}
          {activeTab === 'esia_form' && (
            <form onSubmit={handleSimulateLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Телефон / СНИЛС / Электронная почта
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    required
                    placeholder="+7 (999) 000-00-00 или 123-456-789 00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Пароль от Госуслуг
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    placeholder="Пароль"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Авторизация в ЕСИА Госуслуги...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Войти через Госуслуги</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[10px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Прямой токен сессии (опционально)</div>
                <input
                  type="text"
                  placeholder="Вставить cookie дневника или Dnevnik_Auth_Token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
