import type { DiaryGrade } from '../../shared/diary';
export const SCHOOL_TIME_ZONE = 'Asia/Irkutsk';
const dayFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: SCHOOL_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
export function issuedTimestamp(value: string): number | null {
  if (!value) return null;
  // Offset-free API timestamps are school-local, independent of the phone.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+08:00`
    : /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}+08:00`;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : timestamp;
}
export function schoolDay(timestamp: number): string { return dayFormat.format(timestamp); }
export function feedItems(grades: DiaryGrade[]) {
  return grades.map(grade => ({ id: `grade:${grade.id}:${grade.value}`, grade, timestamp: issuedTimestamp(grade.date) }))
    .sort((a, b) => (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity) || b.grade.id.localeCompare(a.grade.id, 'en', { numeric: true }));
}
export type FeedItem = ReturnType<typeof feedItems>[number];
export function feedDays(grades: DiaryGrade[], now = Date.now()) {
  const today = schoolDay(now);
  const yesterday = schoolDay(now - 86400000);
  const groups = new Map<string, FeedItem[]>([[today, []]]);
  for (const item of feedItems(grades)) {
    const day = item.timestamp === null ? '' : schoolDay(item.timestamp);
    const items = groups.get(day) || [];
    items.push(item); groups.set(day, items);
  }
  return [...groups].sort(([a], [b]) => a === today ? -1 : b === today ? 1 : b.localeCompare(a)).map(([day, items]) => ({
    day, items, isToday: day === today,
    title: day === today ? 'Сегодня' : day === yesterday ? 'Вчера' : day ? new Intl.DateTimeFormat('ru-RU', {
      timeZone: SCHOOL_TIME_ZONE, day: 'numeric', month: 'long', ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}),
    }).format(new Date(`${day}T12:00:00+08:00`)) : 'Дата выставления не указана',
  }));
}
export function lessonCaption(grade: DiaryGrade): string {
  const types: Record<string, string> = { 'ответ на уроке': 'Ответ', 'устный ответ': 'Ответ', 'самостоятельная работа': 'С/р', 'контрольная работа': 'К/р', 'домашняя работа': 'Д/з', 'тест': 'Тест' };
  const type = types[grade.workType.toLowerCase()] || (grade.workType === 'Вид работы не указан' ? 'Оценка' : grade.workType);
  const day = grade.lessonDate.slice(0, 10);
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(day) ? issuedTimestamp(day) : null;
  return timestamp === null ? type : `${type} за ${new Intl.DateTimeFormat('ru-RU', { timeZone: SCHOOL_TIME_ZONE, day: 'numeric', month: 'short' }).format(timestamp)}`;
}
