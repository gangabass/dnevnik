import { describe, expect, it } from 'vitest';
import type { DiaryGrade } from '../../shared/diary';
import { feedDays, feedItems, lessonCaption } from '../../src/services/feedService';
const grade: DiaryGrade = { id: '1', subject: 'Алгебра', subjectId: '2', value: '5', numericValue: 5, workType: 'Ответ на уроке', date: '2026-11-12T10:00:00+08:00', lessonDate: '2026-11-09T00:00:00', teacherName: '', topic: '', period: 1, weight: 1, includeInAverage: true };
const now = Date.parse('2026-11-12T12:00:00+08:00');
describe('Grade feed by issue time', () => {
  it('puts a just-issued grade for an older lesson first in Today', () => {
    const recent = { ...grade, id: '2', date: '2026-11-12T11:55:00+08:00', lessonDate: '2026-11-06T00:00:00' };
    const days = feedDays([grade, recent], now);
    expect(days[0].title).toBe('Сегодня');
    expect(days[0].items.map(item => item.grade.id)).toEqual(['2', '1']);
    expect(lessonCaption(recent)).toContain('6 нояб');
  });
  it('groups history by issue date, not lesson date, and keeps Today empty when needed', () => {
    const yesterday = { ...grade, date: '2026-11-11T10:00:00+08:00', lessonDate: '2026-11-12T00:00:00' };
    const days = feedDays([yesterday, { ...grade, id: 'old', date: '2026-11-08T12:00:00+08:00' }], now);
    expect(days.map(day => day.title)).toEqual(['Сегодня', 'Вчера', '8 ноября']);
    expect(days[0].items).toEqual([]);
    expect(days[1].items[0].grade).toBe(yesterday);
  });
  it('uses Irkutsk midnight for offsets and for timestamps without an offset', () => {
    const rows = feedDays([{ ...grade, date: '2026-11-11T16:15:00Z' }, { ...grade, id: 'local', date: '2026-11-12T00:05:00' }], now);
    expect(rows[0].items.map(item => item.grade.id)).toEqual(['1', 'local']);
    expect(rows).toHaveLength(1);
  });
  it('does not invent an issue date from a lesson date or change existing read IDs', () => {
    const missing = { ...grade, date: '' };
    expect(feedDays([missing], now)[1].title).toBe('Дата выставления не указана');
    expect(feedItems([missing])[0].id).toBe('grade:1:5');
  });
});
