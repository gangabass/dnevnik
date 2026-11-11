import type { DiaryDay } from '../../shared/diary';
export function schoolDateAfter(date: string, offset: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
export function scheduleCalendar(days: DiaryDay[], today: string) {
  const known = new Map(days.map(day => [day.date, day]));
  const dates = new Set([...known.keys(), today, schoolDateAfter(today, 1), schoolDateAfter(today, 2)]);
  return [...dates].sort().map(date => ({ date, schedule: known.get(date) ?? null }));
}
