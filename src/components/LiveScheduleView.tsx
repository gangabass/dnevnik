import React, { useState } from 'react';
import type { DiaryDay } from '../../shared/diary';
export function LiveScheduleView({ days }: { days: DiaryDay[] }) {
  const today = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(today);
  const current = days.find(day => day.date === selectedDate) || days.find(day => day.date >= today) || days[0];
  if (!current) return <p className="p-4 text-sm text-slate-400">Расписание за выбранные даты отсутствует.</p>;
  return <section className="space-y-3"><h2 className="font-bold">Расписание</h2><div className="flex gap-2 overflow-x-auto pb-2">{days.map(day => <button key={day.date} onClick={() => setSelectedDate(day.date)} className={`rounded-xl px-3 py-2 shrink-0 text-xs border ${day.date === current.date ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>{new Date(day.date + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}</button>)}</div><p className="text-xs text-slate-400">{current.lessons.length} уроков · Время указано по расписанию школы</p>
    {!current.lessons.length && <p className="p-4 text-sm text-slate-400">В этот день уроков нет.</p>}
    {current.lessons.map(lesson => <article key={lesson.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="flex gap-3"><span className="text-blue-300 font-bold">{lesson.number || '—'}</span><div className="flex-1 min-w-0"><h3 className="font-semibold text-sm">{lesson.subject}</h3><p className="text-xs text-slate-400 mt-1">{lesson.hours || 'Время не указано'}{lesson.room ? ` · Каб. ${lesson.room}` : ''}</p><p className="text-xs text-slate-400 mt-1">{lesson.teacherName}</p>{lesson.topic && <p className="text-xs mt-2">{lesson.topic}</p>}{lesson.homework && <p className="text-xs mt-3 text-blue-200 whitespace-pre-line">ДЗ: {lesson.homework}</p>}</div></div></article>)}
  </section>;
}
