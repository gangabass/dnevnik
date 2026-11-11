import React, { useEffect, useRef, useState } from 'react';
import { Atom, BookOpen, ChevronLeft, ChevronRight, Dumbbell, FlaskConical, Languages, Music, Palette, Ruler, X } from 'lucide-react';
import type { DiaryGrade } from '../../shared/diary';
import { feedDays, feedItems, issuedTimestamp, lessonCaption, SCHOOL_TIME_ZONE, type FeedItem } from '../services/feedService';

function subjectIcon(subject: string) {
  if (/физкультур|физическ.*культур/i.test(subject)) return Dumbbell;
  if (/хими/i.test(subject)) return FlaskConical;
  if (/физик/i.test(subject)) return Atom;
  if (/геометр|алгебр|математ/i.test(subject)) return Ruler;
  if (/язык/i.test(subject)) return Languages;
  if (/музык/i.test(subject)) return Music;
  if (/рисован|изобраз/i.test(subject)) return Palette;
  return BookOpen;
}
const scoreStyle = (grade: DiaryGrade) => grade.numericValue === 5 || grade.numericValue === 4
  ? 'from-lime-600 to-lime-500' : grade.numericValue === 3 ? 'from-amber-600 to-amber-500'
  : grade.numericValue === 2 ? 'from-red-600 to-rose-500' : 'from-slate-600 to-slate-500';

function GradeRow({ items, readIds, onSelect }: { items: FeedItem[]; readIds: string[]; onSelect: (item: FeedItem) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  function updateEdges() {
    const element = track.current;
    if (element) setEdges({ start: element.scrollLeft < 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 });
  }
  useEffect(() => {
    const observer = new ResizeObserver(updateEdges);
    if (track.current) observer.observe(track.current);
    updateEdges();
    return () => observer.disconnect();
  }, [items.length]);
  return <div className="relative">
    <div ref={track} onScroll={updateEdges} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 pt-1 [scrollbar-width:thin] [scrollbar-color:#334155_transparent]">
      {items.map(item => {
        const grade = item.grade;
        const Icon = subjectIcon(grade.subject);
        const unread = !readIds.includes(item.id);
        return <button key={item.id} onClick={() => onSelect(item)} aria-label={`${grade.subject}: ${grade.value}. ${lessonCaption(grade)}${unread ? '. Новая оценка' : ''}`}
          className="w-28 shrink-0 snap-start text-left rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
          <div className={`relative h-16 overflow-hidden rounded-lg bg-gradient-to-br ${scoreStyle(grade)} text-white shadow-sm`}>
            <Icon aria-hidden="true" className="absolute -right-3 -bottom-4 h-20 w-20 rotate-[-15deg] stroke-[1] opacity-30" />
            <span className="relative flex h-full items-center justify-center text-[42px] leading-none font-medium tracking-tight">{grade.value}</span>
            {unread && <span aria-hidden="true" className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white shadow-sm" />}
          </div>
          <h4 className="mt-2 truncate text-sm font-semibold text-slate-100" title={grade.subject}>{grade.subject}</h4>
          <p className="mt-0.5 truncate text-xs text-slate-400" title={lessonCaption(grade)}>{lessonCaption(grade)}</p>
        </button>;
      })}
    </div>
    {!edges.start && <button aria-label="Предыдущие оценки" onClick={() => track.current?.scrollBy({ left: -250, behavior: 'smooth' })} className="absolute -left-2 top-5 rounded-full bg-slate-800/95 p-1.5 text-white shadow-lg border border-slate-600"><ChevronLeft size={18} /></button>}
    {!edges.end && <button aria-label="Следующие оценки" onClick={() => track.current?.scrollBy({ left: 250, behavior: 'smooth' })} className="absolute -right-2 top-5 rounded-full bg-slate-800/95 p-1.5 text-white shadow-lg border border-slate-600"><ChevronRight size={18} /></button>}
  </div>;
}

function GradeDetails({ grade, onClose }: { grade: DiaryGrade; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const timestamp = issuedTimestamp(grade.date);
  const lessonTimestamp = issuedTimestamp(grade.lessonDate.slice(0, 10));
  return <dialog ref={dialog} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
    className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl backdrop:bg-black/70" aria-labelledby="feed-grade-title">
    <div className="flex items-start justify-between gap-3"><h3 id="feed-grade-title" className="font-bold">{grade.subject}: {grade.value}</h3><button onClick={() => dialog.current?.close()} aria-label="Закрыть" className="rounded-lg p-1 text-slate-400 hover:text-white"><X size={20} /></button></div>
    <div className="mt-4 space-y-3 text-sm"><p>{grade.workType}</p>
      <p className="text-slate-400">Выставлена: {timestamp === null ? 'дата не указана' : new Intl.DateTimeFormat('ru-RU', { timeZone: SCHOOL_TIME_ZONE, dateStyle: 'long', timeStyle: 'short' }).format(timestamp)}</p>
      {lessonTimestamp !== null && <p className="text-slate-400">Урок: {new Intl.DateTimeFormat('ru-RU', { timeZone: SCHOOL_TIME_ZONE, dateStyle: 'long' }).format(lessonTimestamp)}</p>}
      {grade.teacherName && <p>{grade.teacherName}</p>}{grade.topic && <p>{grade.topic}</p>}
      <p className="text-xs text-slate-500">{grade.includeInAverage ? 'Учитывается в среднем' : 'Не учитывается в среднем'}</p>
    </div>
  </dialog>;
}

export function DiaryFeedView({ grades, readIds, onRead }: { grades: DiaryGrade[]; readIds: string[]; onRead: (ids: string[]) => void }) {
  const [now, setNow] = useState(Date.now);
  const [selected, setSelected] = useState<DiaryGrade | null>(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const days = feedDays(grades, now);
  const items = feedItems(grades);
  return <section className="min-w-0 space-y-5">
    <div><div className="flex items-center justify-between gap-2"><h2 className="font-bold text-lg">Лента оценок</h2>{items.some(item => !readIds.includes(item.id)) && <button className="text-xs text-blue-300 hover:text-blue-200" onClick={() => onRead(items.map(item => item.id))}>Прочитать всё</button>}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">Новые оценки — первыми. Под карточкой указана дата урока.</p>
    </div>
    {days.map(group => <section key={group.day || 'unknown'} aria-label={group.title}>
      <div className="mb-2 flex items-center gap-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{group.title}</h3><span className="text-xs text-slate-600">{group.items.length}</span></div>
      {group.items.length ? <GradeRow items={group.items} readIds={readIds} onSelect={item => { onRead([item.id]); setSelected(item.grade); }} />
        : <div className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-400">Сегодня новых оценок пока нет.</div>}
    </section>)}
    {items.length > 0 && <p className="text-xs text-slate-500">Нажмите на оценку, чтобы посмотреть подробности. История показана за загруженный период.</p>}
    {selected && <GradeDetails grade={selected} onClose={() => setSelected(null)} />}
  </section>;
}
