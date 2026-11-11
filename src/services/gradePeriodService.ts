import type { DiaryGrade, DiaryResponse, ReportingPeriod } from '../../shared/diary';
import { schoolDateAfter } from './scheduleService';
export interface GradeRange { start: string; end: string }
export function currentWeek(today: string): GradeRange {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const start = schoolDateAfter(today, -((weekday + 6) % 7));
  return { start, end: schoolDateAfter(start, 6) };
}
export function currentQuarter(periods: ReportingPeriod[], today: string): ReportingPeriod | null {
  const quarters = periods.filter(period => period.type === 'Quarter').sort((a, b) => a.start.localeCompare(b.start));
  return quarters.find(period => period.start <= today && period.end >= today)
    ?? quarters.filter(period => period.start <= today).at(-1) ?? quarters[0] ?? null;
}
export function gradeRangeChunks(range: GradeRange): GradeRange[] {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(range.start) || !valid(range.end) || range.start > range.end) throw new Error('Укажите корректные даты начала и конца периода.');
  if (Date.parse(range.end) - Date.parse(range.start) > 365 * 86400000) throw new Error('Выберите период не длиннее года.');
  const chunks: GradeRange[] = [];
  for (let start = range.start; start <= range.end; start = schoolDateAfter(start, 31)) {
    const end = schoolDateAfter(start, 30);
    chunks.push({ start, end: end > range.end ? range.end : end });
  }
  return chunks;
}
export async function loadPeriodGrades(load: (start: string, end: string, signal: AbortSignal) => Promise<DiaryResponse>, range: GradeRange, signal: AbortSignal): Promise<DiaryGrade[]> {
  const grades = new Map<string, DiaryGrade>();
  for (const chunk of gradeRangeChunks(range)) {
    signal.throwIfAborted();
    const result = await load(chunk.start, chunk.end, signal);
    if (result.grades === null) throw new Error(result.warnings.find(warning => warning.section === 'grades')?.message || 'Не удалось загрузить оценки за весь период.');
    for (const grade of result.grades) grades.set(grade.id, grade);
  }
  return [...grades.values()].sort((a, b) => b.date.localeCompare(a.date));
}
