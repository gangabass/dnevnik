import React, { useEffect, useState } from 'react';
import type { DiaryGrade, GradeHistogram as Histogram } from '../../shared/diary';
import { getGradeHistogram } from '../services/apiService';
import { histogramGroups, peopleCount } from '../services/histogramService';

export function GradeHistogram({ grade, token }: { grade: DiaryGrade; token: string }) {
  const [groups, setGroups] = useState<Histogram[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setGroups(null); setError('');
    if (!token) return;
    const controller = new AbortController();
    getGradeHistogram(token, grade, controller.signal).then(result => {
      if (!controller.signal.aborted) setGroups(histogramGroups(result.groups, grade.markNumber ?? result.markNumber));
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Не удалось загрузить статистику.'); });
    return () => controller.abort();
  }, [token, grade.id, grade.workId, grade.markNumber, revision]);
  return <section className="mt-5 border-t border-slate-700 pt-4" aria-label="Распределение оценок класса">
    <h4 className="text-sm font-semibold">Оценки класса за эту работу</h4>
    {!token ? <p className="mt-2 text-xs text-slate-400">Введите токен, чтобы посмотреть распределение оценок.</p>
      : error ? <div role="status" className="mt-2 text-xs text-slate-400"><p>{error}</p><button onClick={() => setRevision(value => value + 1)} className="mt-2 text-blue-300 underline">Повторить</button></div>
      : groups === null ? <p role="status" className="mt-2 text-xs text-slate-400">Загружаем распределение…</p>
      : !groups.some(group => group.marks.length) ? <p className="mt-2 text-xs text-slate-400">Статистики для этой оценки пока нет.</p>
      : groups.map(group => <div key={group.markNumber} className="mt-3">
        {groups.length > 1 && <p className="mb-2 text-xs text-slate-400">Оценка {group.markNumber + 1}</p>}
        <ul className="space-y-1.5">{group.marks.map(mark => <li key={mark.value} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${mark.value === grade.value ? 'bg-blue-500/15 text-blue-100' : 'bg-slate-950/50 text-slate-300'}`}>
          <span className="w-6 text-center text-lg font-bold">{mark.value}</span><span aria-hidden="true" className="text-slate-600">—</span><span>{peopleCount(mark.count)}</span>
        </li>)}</ul>
      </div>)}
  </section>;
}
