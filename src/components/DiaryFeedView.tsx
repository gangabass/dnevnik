import React from 'react';
import type { DiaryGrade } from '../../shared/diary';
import type { HomeworkItem } from '../types';
export function feedItems(grades: DiaryGrade[], homework: HomeworkItem[]) {
  return [...grades.map(grade => ({ id: `grade:${grade.id}:${grade.value}`, title: `${grade.subject}: ${grade.value}`, text: grade.workType, date: grade.date, tab: 'grades' as const })),
    ...homework.map(item => ({ id: `homework:${item.id}`, title: item.subject, text: item.text, date: item.dateGiven || item.dateDue, tab: 'homework' as const }))].sort((a, b) => b.date.localeCompare(a.date));
}
export function DiaryFeedView({ grades, homework, readIds, onRead, onNavigate }: { grades: DiaryGrade[]; homework: HomeworkItem[]; readIds: string[]; onRead: (ids: string[]) => void; onNavigate: (tab: 'grades' | 'homework') => void }) {
  const items = feedItems(grades, homework);
  return <section className="space-y-3"><div className="flex justify-between gap-2"><h2 className="font-bold">Лента дневника</h2><button className="text-xs text-blue-300" onClick={() => onRead(items.map(item => item.id))}>Прочитать всё</button></div><p className="text-xs text-slate-400">Оценки и ДЗ за загруженные даты.</p>{!items.length && <p className="text-sm text-slate-400 p-4">Пока нет записей.</p>}{items.map(item => <button key={item.id} onClick={() => { onRead([item.id]); onNavigate(item.tab); }} className={`block w-full text-left p-4 rounded-2xl border bg-slate-900 ${readIds.includes(item.id) ? 'border-slate-800' : 'border-blue-600/60'}`}><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{item.title}</h3><span className="text-[10px] text-slate-500">{item.tab === 'grades' ? 'Оценка' : 'ДЗ'}</span></div><p className="mt-2 text-xs text-slate-400 line-clamp-3">{item.text}</p><p className="mt-2 text-xs text-slate-500">{item.date ? new Date(item.date).toLocaleString('ru-RU') : ''}</p></button>)}</section>;
}
