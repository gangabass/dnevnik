import type { GradeHistogram } from '../../shared/diary';
export function peopleCount(count: number): string {
  const form = new Intl.PluralRules('ru-RU').select(count);
  return `${count} ${form === 'few' ? 'человека' : 'человек'}`;
}
export function histogramGroups(groups: GradeHistogram[], markNumber?: number): GradeHistogram[] {
  // Never combine the two halves of a double grade: they may describe the same people.
  return markNumber === undefined ? groups : groups.filter(group => group.markNumber === markNumber);
}
