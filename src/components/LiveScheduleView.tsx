import React, { useEffect, useState } from 'react';
import type { DiaryDay } from '../../shared/diary';
import { schoolDay, SCHOOL_TIME_ZONE } from '../services/feedService';
import { scheduleCalendar } from '../services/scheduleService';

const dateLabel = (date: string, weekday = false) => new Intl.DateTimeFormat('ru-RU', {
  timeZone: SCHOOL_TIME_ZONE, day: 'numeric', month: 'short', ...(weekday ? { weekday: 'short' as const } : {}),
}).format(new Date(`${date}T12:00:00+08:00`));

export function LiveScheduleView({ days, startDate, endDate }: { days: DiaryDay[]; startDate?: string; endDate?: string }) {
  const [today, setToday] = useState(() => schoolDay(Date.now()));
  const [selection, setSelection] = useState<string | null>(null);
  const calendar = scheduleCalendar(days, today);
  const selectedDate = selection && calendar.some(day => day.date === selection) ? selection : today;
  const current = calendar.find(day => day.date === selectedDate)?.schedule;
  useEffect(() => {
    const timer = setInterval(() => setToday(schoolDay(Date.now())), 60000);
    return () => clearInterval(timer);
  }, []);
  const outsideRange = (startDate && selectedDate < startDate) || (endDate && selectedDate > endDate);
  return <section className="min-w-0 space-y-3">
    <h2 className="font-bold">Расписание</h2>
    <div className="grid grid-cols-7 gap-1" aria-label="Даты расписания">
      {calendar.map(day => <button key={day.date} onClick={() => setSelection(day.date === today ? null : day.date)} aria-pressed={day.date === selectedDate} aria-label={`${day.date === today ? 'Сегодня, ' : ''}${dateLabel(day.date, true)}`} aria-current={day.date === today ? 'date' : undefined}
        className={`min-w-0 rounded-xl px-0.5 py-2 text-center border ${day.date === selectedDate ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
        <span className="block text-[9px] leading-4">{day.date === today ? 'Сегодня' : new Intl.DateTimeFormat('ru-RU', { timeZone: SCHOOL_TIME_ZONE, weekday: 'short' }).format(new Date(`${day.date}T12:00:00+08:00`))}</span>
        <span className="mt-0.5 block text-lg font-semibold leading-6">{Number(day.date.slice(8, 10))}</span>
      </button>)}
    </div>
    <h3 className="text-sm font-semibold">{dateLabel(selectedDate, true)}</h3>
    {!current ? <p role="status" className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">{outsideRange
      ? 'Эта дата вне загруженного периода. Выберите период с нужной датой выше и нажмите «Обновить дневник».'
      : 'Расписание на эту дату пока не получено. Попробуйте обновить дневник.'}</p>
      : !current.lessons.length ? <p role="status" className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">На эту дату уроков в расписании нет.</p>
      : <p className="text-xs text-slate-400">Уроков: {current.lessons.length} · Время по расписанию школы</p>}
    {current?.lessons.map(lesson => <article key={lesson.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="flex gap-3"><span className="text-blue-300 font-bold">{lesson.number || '—'}</span><div className="flex-1 min-w-0"><h3 className="font-semibold text-sm">{lesson.subject}</h3><p className="text-xs text-slate-400 mt-1">{lesson.hours || 'Время не указано'}{lesson.room ? ` · Каб. ${lesson.room}` : ''}</p><p className="text-xs text-slate-400 mt-1">{lesson.teacherName}</p>{lesson.topic && <p className="text-xs mt-2">{lesson.topic}</p>}{lesson.homework && <p className="text-xs mt-3 text-blue-200 whitespace-pre-line">ДЗ: {lesson.homework}</p>}</div></div></article>)}
  </section>;
}
