import React, { useEffect, useState } from 'react';
import type { DiaryGrade, ReportingPeriod, Connection } from '../../shared/diary';
import { GradeDetails } from './GradeDetails';
import { average, fivesToReach45, fiveWord } from '../services/diaryService';
import { schoolDay } from '../services/feedService';
import { getDiary, getReportingPeriods } from '../services/apiService';
import { currentQuarter, previousQuarters, currentWeek, gradeRangeChunks, loadPeriodGrades, type GradeRange } from '../services/gradePeriodService';
const scoreClass = (value: number | null) => value === 5 ? 'bg-emerald-600' : value === 4 ? 'bg-blue-600' : value === 3 ? 'bg-amber-600' : value === 2 ? 'bg-red-600' : 'bg-slate-700';
export function LiveGradesView({ token, connection, refresh }: { token: string; connection: Connection | null; refresh: number }) {
  const [mode, setMode] = useState('quarter');
  const [today, setToday] = useState(() => schoolDay(Date.now()));
  const [periods, setPeriods] = useState<ReportingPeriod[] | null>(null);
  const [periodError, setPeriodError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [custom, setCustom] = useState(() => currentWeek(today));
  const [appliedCustom, setAppliedCustom] = useState(custom);
  const [loaded, setLoaded] = useState<{ key: string; grades: DiaryGrade[] } | null>(null);
  const [selected, setSelected] = useState<DiaryGrade | null>(null);
  const person = connection?.personId || '';
  const school = connection?.schoolId || '';
  const quarter = currentQuarter(periods || [], today);
  const pastQuarters = previousQuarters(periods || [], today);
  const selectedQuarter = mode.startsWith('past:') ? pastQuarters.find(period => `past:${period.id}` === mode) : quarter;
  const range: GradeRange | null = mode === 'week' ? currentWeek(today) : mode === 'custom' ? appliedCustom : selectedQuarter ? { start: selectedQuarter.start, end: selectedQuarter.end } : null;
  const rangeKey = range ? `${person}:${school}:${range.start}:${range.end}` : '';
  useEffect(() => { const timer = setInterval(() => setToday(schoolDay(Date.now())), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => { setPeriods(null); }, [token, person, school]);
  useEffect(() => {
    setPeriodError('');
    if (!token || !person || !school) return;
    const controller = new AbortController();
    getReportingPeriods(token, person, school, controller.signal).then(result => {
      if (!controller.signal.aborted) setPeriods(result.periods);
    }).catch(error => { if (!controller.signal.aborted) setPeriodError(error instanceof Error ? error.message : 'Не удалось загрузить четверти.'); });
    return () => controller.abort();
  }, [token, person, school, refresh]);
  useEffect(() => {
    if (!token || !range || !person || !school) { setBusy(false); return; }
    const controller = new AbortController();
    setBusy(true); setError('');
    loadPeriodGrades((start, end, signal) => getDiary(token, person, school, start, end, signal), range, controller.signal).then(grades => {
      if (!controller.signal.aborted) setLoaded({ key: rangeKey, grades });
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Не удалось загрузить оценки.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [token, person, school, rangeKey, refresh, revision]);
  const filtered = !busy && !error && loaded?.key === rangeKey ? loaded.grades : [];
  const subjects = [...new Set(filtered.map(grade => grade.subject))].sort((a, b) => a.localeCompare(b, 'ru'));
  const mean = average(filtered);
  return <section className="space-y-4">
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4"><h2 className="font-bold">Оценки</h2>
      <label className="block text-xs mt-3 text-slate-400">Период<select className="block w-full bg-slate-950 border border-slate-700 p-2 rounded-lg mt-1" value={mode} onChange={event => { setMode(event.target.value); setError(''); }}><option value="quarter">{quarter?.name || 'Текущая четверть'}</option><option value="week">Текущая неделя</option><option value="custom">Задать свой период</option>{pastQuarters.map(period => <option key={period.id} value={`past:${period.id}`}>{period.name}</option>)}</select></label>
      {mode === 'custom' && <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); try { gradeRangeChunks(custom); setError(''); setAppliedCustom({ ...custom }); setRevision(value => value + 1); } catch (error) { setError(error instanceof Error ? error.message : 'Проверьте даты.'); } }}>
        <div className="grid grid-cols-2 gap-2"><label className="min-w-0 text-xs text-slate-400">С даты<input required aria-label="Оценки с даты" type="date" value={custom.start} onChange={event => setCustom({ ...custom, start: event.target.value })} className="mt-1 block min-w-0 w-full rounded-lg border border-slate-700 bg-slate-950 p-2" /></label><label className="min-w-0 text-xs text-slate-400">По дату<input required aria-label="Оценки по дату" type="date" value={custom.end} onChange={event => setCustom({ ...custom, end: event.target.value })} className="mt-1 block min-w-0 w-full rounded-lg border border-slate-700 bg-slate-950 p-2" /></label></div>
        <button disabled={busy} className="w-full rounded-lg bg-blue-600 py-2 text-sm disabled:opacity-50">Показать оценки</button>
      </form>}
      {range && <p className="mt-3 text-xs text-slate-400">{(mode === 'quarter' || mode.startsWith('past:')) && selectedQuarter?.name ? `${selectedQuarter.name} · ` : ''}{range.start.split('-').reverse().join('.')} — {range.end.split('-').reverse().join('.')}</p>}
      {!token ? <p className="mt-3 text-sm text-amber-300">Введите токен, чтобы загрузить оценки за выбранный период.</p> : mode !== 'week' && mode !== 'custom' && !range ? <p role="status" className="mt-3 text-sm text-slate-400">{periodError || (periods === null ? 'Загружаем четверти…' : 'Школа не передала границы четверти. Выберите свой период.')}</p> : null}
      {busy && <p role="status" className="mt-3 text-sm text-blue-300">Загружаем оценки за весь период…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      {!busy && !error && loaded?.key === rangeKey && <><p className="text-sm text-slate-400 mt-3">Всего: {filtered.length} · Средний балл: {mean === null ? '—' : mean.toFixed(2)}</p><p className="text-xs text-slate-500 mt-1">Среднее рассчитано по отметкам, учитываемым в среднем. Если школа использует веса, а API их не передал, среднее не вычисляется.</p></>}
    </div>
    {!busy && !error && token && range && loaded?.key === rangeKey && !filtered.length && <p className="text-sm text-slate-400 p-4">За выбранный период оценок нет.</p>}
    {subjects.map(subject => { const list = filtered.filter(grade => grade.subject === subject); const mean = average(list); const fives = fivesToReach45(list); return <article key={subject} className="p-4 rounded-2xl bg-slate-900 border border-slate-800"><div className="flex justify-between gap-2"><h3 className="font-semibold text-sm">{subject}</h3><span className="text-sm text-blue-300">{mean === null ? '—' : mean.toFixed(2)}</span></div>{fives !== null && fives > 0 && <p className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-300">Можно исправить. Получи ещё {fives} {fiveWord(fives)}, чтобы достичь среднего 4,5.</p>}<div className="flex flex-wrap gap-2 mt-3">{list.map(grade => <button key={grade.id} onClick={() => setSelected(grade)} title={`${grade.workType}, ${grade.date.slice(0, 10)}`} className={`min-w-10 px-3 py-2 rounded-xl font-bold ${scoreClass(grade.numericValue)}`}>{grade.value}</button>)}</div></article>; })}
    {selected && <GradeDetails key={selected.id} grade={selected} token={token} onClose={() => setSelected(null)} />}
  </section>;
}
