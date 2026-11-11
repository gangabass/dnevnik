import React, { useEffect, useRef, useState } from 'react';
import type { DiaryDay } from '../../shared/diary';
import { schoolDay, SCHOOL_TIME_ZONE } from '../services/feedService';
import { scheduleCalendar, schoolDateAfter } from '../services/scheduleService';

const dateLabel = (date: string, weekday = false) => new Intl.DateTimeFormat('ru-RU', {
  timeZone: SCHOOL_TIME_ZONE, day: 'numeric', month: 'short', ...(weekday ? { weekday: 'short' as const } : {}),
}).format(new Date(`${date}T12:00:00+08:00`));

export function LiveScheduleView({ days, startDate, endDate }: { days: DiaryDay[]; startDate?: string; endDate?: string }) {
  const [today, setToday] = useState(() => schoolDay(Date.now()));
  const [selection, setSelection] = useState<string | null>(null);
  const selectedDate = selection || today;
  const calendar = scheduleCalendar(days, today);
  const current = calendar.find(day => day.date === selectedDate)?.schedule;
  const track = useRef<HTMLDivElement>(null);
  const selectedButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const timer = setInterval(() => setToday(schoolDay(Date.now())), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (track.current && selectedButton.current) track.current.scrollTo({
      left: selectedButton.current.offsetLeft - (track.current.clientWidth - selectedButton.current.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [selectedDate, days]);
  const outsideRange = (startDate && selectedDate < startDate) || (endDate && selectedDate > endDate);
  return <section className="min-w-0 space-y-3">
    <h2 className="font-bold">Расписание</h2>
    <div className="grid grid-cols-3 gap-2">
      {['Сегодня', 'Завтра', 'Послезавтра'].map((label, offset) => {
        const date = schoolDateAfter(today, offset);
        return <button key={label} aria-pressed={date === selectedDate} onClick={() => setSelection(offset === 0 ? null : date)}
          className={`rounded-xl border px-2 py-2.5 text-center ${date === selectedDate ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'}`}>
          <span className="block text-xs font-semibold">{label}</span><span className={`mt-1 block text-[11px] ${date === selectedDate ? 'text-blue-100' : 'text-slate-500'}`}>{dateLabel(date)}</span>
        </button>;
      })}
    </div>
    <div ref={track} className="relative flex gap-2 overflow-x-auto pb-2" aria-label="Даты расписания">
      {calendar.map(day => <button key={day.date} ref={day.date === selectedDate ? selectedButton : undefined} onClick={() => setSelection(day.date === today ? null : day.date)} aria-pressed={day.date === selectedDate}
        className={`rounded-xl px-3 py-2 shrink-0 text-xs border ${day.date === selectedDate ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>{dateLabel(day.date, true)}</button>)}
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
