import { describe, expect, it } from 'vitest';
import type { DiaryDay } from '../../shared/diary';
import { scheduleCalendar, schoolDateAfter } from '../../src/services/scheduleService';

describe('Upcoming schedule navigation', () => {
  it('keeps tomorrow selectable after two weeks of history and preserves an empty day after it', () => {
    const days: DiaryDay[] = [
      { date: '2026-10-29', lessons: [] }, { date: '2026-11-12', lessons: [] },
      { date: '2026-11-13', lessons: [{ id: 'lesson', number: 1, subject: 'Алгебра', topic: '', hours: '', room: '', teacherName: '', homework: '' }] },
      { date: '2026-11-14', lessons: [] },
    ];
    const calendar = scheduleCalendar(days, '2026-11-12');
    expect(calendar.map(day => day.date)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
    expect(calendar.find(day => day.date === '2026-11-13')?.schedule?.lessons[0].subject).toBe('Алгебра');
    expect(calendar.find(day => day.date === '2026-11-14')?.schedule).toEqual({ date: '2026-11-14', lessons: [] });
  });
  it('does not silently show another day when tomorrow was not returned by the API', () => {
    const calendar = scheduleCalendar([{ date: '2026-11-12', lessons: [] }], '2026-11-12');
    expect(calendar).toHaveLength(7);
    expect(calendar.find(day => day.date === '2026-11-13')?.schedule).toBeNull();
  });
  it('handles tomorrow and the day after across month and year boundaries', () => {
    expect(schoolDateAfter('2026-11-30', 2)).toBe('2026-12-02');
    expect(schoolDateAfter('2026-12-31', 1)).toBe('2027-01-01');
  });
});
