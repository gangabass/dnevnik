import React, { useState } from 'react';
import type { DiaryGrade } from '../../shared/diary';
import { average } from '../services/diaryService';
const scoreClass = (value: number | null) => value === 5 ? 'bg-emerald-600' : value === 4 ? 'bg-blue-600' : value === 3 ? 'bg-amber-600' : value === 2 ? 'bg-red-600' : 'bg-slate-700';
export function LiveGradesView({ grades }: { grades: DiaryGrade[] }) {
  const [quarter, setQuarter] = useState('all');
  const [selected, setSelected] = useState<DiaryGrade | null>(null);
  const periods = [...new Set(grades.map(grade => grade.period).filter(value => value !== null))].sort();
  const filtered = grades.filter(grade => quarter === 'all' || String(grade.period) === quarter);
  const subjects = [...new Set(filtered.map(grade => grade.subject))].sort((a, b) => a.localeCompare(b, 'ru'));
  const mean = average(filtered);
  return <section className="space-y-4">
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4"><h2 className="font-bold">Оценки за выбранные даты</h2><p className="text-sm text-slate-400 mt-2">Всего: {filtered.length} · Средний балл: {mean === null ? '—' : mean.toFixed(2)}</p><p className="text-xs text-slate-500 mt-1">Среднее рассчитано по загруженным отметкам, учитываемым в среднем. Если школа использует веса, а API их не передал, среднее не вычисляется.</p>
      <label className="block text-xs mt-3 text-slate-400">Учебный период<select className="block w-full bg-slate-950 border border-slate-700 p-2 rounded-lg mt-1" value={quarter} onChange={event => setQuarter(event.target.value)}><option value="all">Все периоды</option>{periods.map(period => <option key={period} value={period}>Период {period}</option>)}</select></label>
    </div>
    {!filtered.length && <p className="text-sm text-slate-400 p-4">За выбранные даты и период оценок нет.</p>}
    {subjects.map(subject => { const list = filtered.filter(grade => grade.subject === subject); const mean = average(list); return <article key={subject} className="p-4 rounded-2xl bg-slate-900 border border-slate-800"><div className="flex justify-between gap-2"><h3 className="font-semibold text-sm">{subject}</h3><span className="text-sm text-blue-300">{mean === null ? '—' : mean.toFixed(2)}</span></div><div className="flex flex-wrap gap-2 mt-3">{list.map(grade => <button key={grade.id} onClick={() => setSelected(grade)} title={`${grade.workType}, ${grade.date.slice(0, 10)}`} className={`min-w-10 px-3 py-2 rounded-xl font-bold ${scoreClass(grade.numericValue)}`}>{grade.value}</button>)}</div></article>; })}
    {selected && <div role="dialog" aria-modal="true" aria-label="Подробности оценки" className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><section className="bg-slate-900 border border-slate-700 p-5 rounded-2xl w-full max-w-sm space-y-3"><div className="flex justify-between"><h3 className="font-bold">{selected.subject}: {selected.value}</h3><button onClick={() => setSelected(null)} aria-label="Закрыть">✕</button></div><p className="text-sm">{selected.workType}</p><p className="text-sm text-slate-400">Выставлена: {new Date(selected.date).toLocaleString('ru-RU')}</p>{selected.lessonDate && <p className="text-sm text-slate-400">Урок: {selected.lessonDate.slice(0, 10)}</p>}<p className="text-sm">{selected.teacherName}</p>{selected.topic && <p className="text-sm">{selected.topic}</p>}<p className="text-xs text-slate-400">{selected.includeInAverage ? 'Учитывается в среднем' : 'Не учитывается в среднем'} · Вес: {selected.weight ?? 'не передан API'}</p></section></div>}
  </section>;
}
