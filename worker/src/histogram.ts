import type { GradeHistogram } from '../../shared/diary';
import { row } from './dnevnik';
import { ApiFailure } from './upstream';
export function normalizeHistogram(value: unknown): GradeHistogram[] {
  const source = row(value).markNumbers;
  if (!Array.isArray(source)) throw new ApiFailure('Дневник.ру вернул некорректную статистику оценок.', 502);
  return source.map(value => {
    const group = row(value);
    if (!Number.isSafeInteger(group.markNumber) || Number(group.markNumber) < 0 || !Array.isArray(group.marks)) throw new ApiFailure('Некорректная группа статистики.', 502);
    return { markNumber: Number(group.markNumber), marks: group.marks.map(value => {
      const mark = row(value);
      if (typeof mark.value !== 'string' || !Number.isSafeInteger(mark.count) || Number(mark.count) < 0) throw new ApiFailure('Некорректное количество оценок.', 502);
      return { value: mark.value.slice(0, 20), count: Number(mark.count) };
    }).sort((a, b) => b.value.localeCompare(a.value, 'ru', { numeric: true })) };
  }).sort((a, b) => a.markNumber - b.markNumber);
}
