import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { DiaryGrade } from '../../shared/diary';
import { issuedTimestamp, SCHOOL_TIME_ZONE } from '../services/feedService';
import { GradeHistogram } from './GradeHistogram';

export function GradeDetails({ grade, token, onClose }: { grade: DiaryGrade; token: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const timestamp = issuedTimestamp(grade.date);
  const lessonTimestamp = issuedTimestamp(grade.lessonDate.slice(0, 10));
  return <dialog ref={dialog} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
    className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl backdrop:bg-black/70" aria-labelledby="grade-details-title">
    <div className="flex items-start justify-between gap-3"><h3 id="grade-details-title" className="font-bold">{grade.subject}: {grade.value}</h3><button onClick={() => dialog.current?.close()} aria-label="Закрыть" className="rounded-lg p-1 text-slate-400 hover:text-white"><X size={20} /></button></div>
    <div className="mt-4 space-y-3 text-sm"><p>{grade.workType}</p>
      <p className="text-slate-400">Выставлена: {timestamp === null ? 'дата не указана' : new Intl.DateTimeFormat('ru-RU', { timeZone: SCHOOL_TIME_ZONE, dateStyle: 'long', timeStyle: 'short' }).format(timestamp)}</p>
      {lessonTimestamp !== null && <p className="text-slate-400">Урок: {new Intl.DateTimeFormat('ru-RU', { timeZone: SCHOOL_TIME_ZONE, dateStyle: 'long' }).format(lessonTimestamp)}</p>}
      {grade.teacherName && <p>{grade.teacherName}</p>}{grade.topic && <p>{grade.topic}</p>}
      <p className="text-xs text-slate-500">{grade.includeInAverage ? 'Учитывается в среднем' : 'Не учитывается в среднем'} · Вес: {grade.weight ?? 'не передан API'}</p>
    </div>
    <GradeHistogram grade={grade} token={token} />
  </dialog>;
}
