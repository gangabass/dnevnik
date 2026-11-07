import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Vibrate, 
  Moon, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  Trash2, 
  History,
  ShieldCheck,
  Settings
} from 'lucide-react';
import { PushNotificationConfig, GradeItem, GradeValue } from '../types';
import { notificationService } from '../services/notificationService';
import { storageService, PushLogItem } from '../services/storageService';

interface PushNotificationSettingsProps {
  config: PushNotificationConfig;
  onUpdateConfig: (config: PushNotificationConfig) => void;
  onSimulateCustomGrade: (grade: Omit<GradeItem, 'id' | 'date'>) => void;
}

export const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  config,
  onUpdateConfig,
  onSimulateCustomGrade,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [logs, setLogs] = useState<PushLogItem[]>([]);
  const [testSentToast, setTestSentToast] = useState(false);

  // Custom grade simulation form
  const [customSubject, setCustomSubject] = useState('Алгебра');
  const [customValue, setCustomValue] = useState<GradeValue>(5);
  const [customWorkType, setCustomWorkType] = useState<GradeItem['workType']>('Контрольная работа');
  const [customWeight, setCustomWeight] = useState<number>(2.0);
  const [customTopic, setCustomTopic] = useState('Итоговая контрольная работа №4');
  const [customTeacher, setCustomTeacher] = useState('Ковалёва Ирина Викторовна');

  useEffect(() => {
    setPermission(notificationService.getPermission());
    setLogs(storageService.getPushLogs());
  }, []);

  const handleRequestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      onUpdateConfig({ ...config, enabled: true });
    }
  };

  const handleSendTestPush = async () => {
    await notificationService.sendTestNotification(config);
    const newLog: PushLogItem = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: 'Дневник.ру Иркутск: Тестовый пуш',
      body: 'Уведомления о новых отметках активны и проверены.',
      gradeValue: 5,
      subject: 'Алгебра',
    };
    const updated = storageService.addPushLog(newLog);
    setLogs(updated);

    setTestSentToast(true);
    setTimeout(() => setTestSentToast(false), 2500);
  };

  const handleTriggerCustomGrade = () => {
    onSimulateCustomGrade({
      subject: customSubject,
      value: customValue,
      weight: customWeight,
      workType: customWorkType,
      topic: customTopic,
      teacherName: customTeacher,
      comment: customValue === 5 ? 'Отличный ответ!' : 'Есть над чем поработать',
      period: 3,
    });

    const newLog: PushLogItem = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: `Новая отметка: ${customValue} по ${customSubject}`,
      body: `${customWorkType} (вес ${customWeight}) • ${customTopic}`,
      gradeValue: customValue,
      subject: customSubject,
    };
    const updated = storageService.addPushLog(newLog);
    setLogs(updated);

    setTestSentToast(true);
    setTimeout(() => setTestSentToast(false), 2500);
  };

  const handleClearLogs = () => {
    storageService.clearPushLogs();
    setLogs([]);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Toast Alert */}
      {testSentToast && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Пуш-уведомление успешно сформировано и отправлено на устройство!</span>
        </div>
      )}

      {/* Permission Status Banner */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                permission === 'granted'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : permission === 'denied'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              <Bell className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-white">
                Системные пуш-уведомления
              </h3>
              <p className="text-xs text-slate-400">
                Статус в системе Android / Браузере:{' '}
                <span
                  className={`font-semibold ${
                    permission === 'granted'
                      ? 'text-emerald-400'
                      : permission === 'denied'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {permission === 'granted'
                    ? 'Разрешены (Активно)'
                    : permission === 'denied'
                    ? 'Заблокированы'
                    : 'Требуется подтверждение'}
                </span>
              </p>
            </div>
          </div>

          {permission !== 'granted' ? (
            <button
              onClick={handleRequestPermission}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition active:scale-95 shrink-0"
            >
              Включить пуш
            </button>
          ) : (
            <button
              onClick={handleSendTestPush}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 font-semibold text-xs border border-slate-700 transition active:scale-95 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Тестовый пуш</span>
            </button>
          )}
        </div>

        {permission === 'denied' && (
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-900/50 text-[11px] text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>
              Уведомления заблокированы в настройках браузера. Чтобы получать пуши о новых оценках, нажмите на значок замка в строке адреса и включите «Уведомления».
            </span>
          </div>
        )}
      </div>

      {/* Teacher Grade Simulator */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900 border border-blue-900/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-sm text-white">
              Симулятор выставления оценки учителем
            </h4>
          </div>
          <span className="text-[10px] font-bold text-blue-300 bg-blue-950 px-2 py-0.5 rounded-full border border-blue-800/40">
            Мгновенный пуш
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Проверьте работу пуш-уведомлений: выберите отметку и предмет, будто учитель прямо сейчас заполнил электронный журнал школы.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
              Предмет
            </label>
            <select
              value={customSubject}
              onChange={(e) => {
                setCustomSubject(e.target.value);
                if (e.target.value === 'Физика') setCustomTeacher('Михайлов Сергей Александрович');
                else if (e.target.value === 'Русский язык') setCustomTeacher('Воронина Татьяна Петровна');
                else if (e.target.value === 'Химия') setCustomTeacher('Павленко Светлана Юрьевна');
                else setCustomTeacher('Ковалёва Ирина Викторовна');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Алгебра">Алгебра</option>
              <option value="Физика">Физика</option>
              <option value="Русский язык">Русский язык</option>
              <option value="Химия">Химия</option>
              <option value="Геометрия">Геометрия</option>
              <option value="Информатика">Информатика</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
              Отметка
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[5, 4, 3, 2].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCustomValue(val as GradeValue)}
                  className={`py-2 rounded-xl font-black text-sm transition ${
                    customValue === val
                      ? val === 5
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                        : val === 4
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : val === 3
                        ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                        : 'bg-rose-600 text-white ring-2 ring-rose-400'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
              Вид работы
            </label>
            <select
              value={customWorkType}
              onChange={(e) => {
                const wt = e.target.value as GradeItem['workType'];
                setCustomWorkType(wt);
                if (wt === 'Контрольная работа') setCustomWeight(2.0);
                else if (wt === 'Лабораторная работа' || wt === 'Самостоятельная работа') setCustomWeight(1.5);
                else setCustomWeight(1.0);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Контрольная работа">Контрольная работа (x2.0)</option>
              <option value="Самостоятельная работа">Самостоятельная работа (x1.5)</option>
              <option value="Лабораторная работа">Лабораторная работа (x1.5)</option>
              <option value="Ответ на уроке">Ответ на уроке (x1.0)</option>
              <option value="Тестирование">Тестирование (x1.0)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
              Тема работы
            </label>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>
        </div>

        <button
          onClick={handleTriggerCustomGrade}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Выставить отметку и отправить пуш-уведомление</span>
        </button>
      </div>

      {/* Push Notification Options */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
        <h4 className="font-bold text-sm text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-400" />
          Параметры уведомлений
        </h4>

        {/* Sound toggle */}
        <div className="flex items-center justify-between py-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {config.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
            <div>
              <span className="text-xs font-semibold text-white block">
                Звуковой сигнал школьного колокольчика
              </span>
              <span className="text-[11px] text-slate-400">
                Приятный перезвон при выставлении отметки
              </span>
            </div>
          </div>
          <button
            onClick={() => onUpdateConfig({ ...config, soundEnabled: !config.soundEnabled })}
            className={`w-11 h-6 rounded-full transition relative ${
              config.soundEnabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition absolute top-1 ${
                config.soundEnabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Vibration toggle */}
        <div className="flex items-center justify-between py-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Vibrate className="w-4 h-4 text-blue-400" />
            <div>
              <span className="text-xs font-semibold text-white block">
                Виброотклик Android
              </span>
              <span className="text-[11px] text-slate-400">
                Тактильная вибрация при поступлении оценки
              </span>
            </div>
          </div>
          <button
            onClick={() => onUpdateConfig({ ...config, vibrationEnabled: !config.vibrationEnabled })}
            className={`w-11 h-6 rounded-full transition relative ${
              config.vibrationEnabled ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition absolute top-1 ${
                config.vibrationEnabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Filter minimum grade */}
        <div className="py-2">
          <div className="text-xs font-semibold text-white mb-1.5">
            Фильтр оценок для пуш-уведомлений:
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => onUpdateConfig({ ...config, minGradeAlert: 2 })}
              className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition border text-center ${
                config.minGradeAlert === 2
                  ? 'bg-blue-600 text-white border-blue-500 shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Обо всех отметках (2, 3, 4, 5)
            </button>
            <button
              onClick={() => onUpdateConfig({ ...config, minGradeAlert: 4 })}
              className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition border text-center ${
                config.minGradeAlert === 4
                  ? 'bg-blue-600 text-white border-blue-500 shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Только хорошие (4 и 5)
            </button>
            <button
              onClick={() => onUpdateConfig({ ...config, minGradeAlert: 5 })}
              className={`py-2 px-2 rounded-xl text-[11px] font-semibold transition border text-center ${
                config.minGradeAlert === 5
                  ? 'bg-blue-600 text-white border-blue-500 shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Только пятёрки (5)
            </button>
          </div>
        </div>
      </div>

      {/* Push Delivery Log */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <h4 className="font-bold text-sm text-white">
              Журнал отправленных пуш-уведомлений
            </h4>
          </div>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить
            </button>
          )}
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Журнал пуш-уведомлений пуст. Нажмите «Тестовый пуш» или «Смоделировать новую оценку».
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-white leading-tight">
                    {log.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {log.body}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono shrink-0">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
