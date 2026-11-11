import { describe, expect, it } from 'vitest';
import { average, mergeDiary, newMarks, fivesToReach45, fiveWord } from '../../src/services/diaryService';
import type { DiaryGrade, DiaryResponse, HomeworkCache } from '../../shared/diary';
const grade: DiaryGrade = { id: '1', subject: 'Алгебра', subjectId: '2', value: '4', numericValue: 4, workType: 'Ответ', date: '2026-11-10T12:00:00', lessonDate: '', teacherName: '', topic: '', period: 1, weight: 1, includeInAverage: true };
const response: DiaryResponse = { ok: true, student: { schoolName: '', className: '', usesWeightedAverage: false }, homework: [], grades: [grade], schedule: [], warnings: [] };
const previous: HomeworkCache = { homework: [], grades: [grade], updatedAt: '2026-11-10T13:00:00', startDate: '2026-11-01', endDate: '2026-11-10', seenMarks: ['1:4'] };
describe('Diary cache and alerts', () => {
  it('preserves failed sections and their own dates', () => {
    const cache = mergeDiary({ ...response, grades: null }, { ...previous, sectionDates: { grades: { start: '2026-11-01', end: '2026-11-10', updatedAt: previous.updatedAt } } }, '2026-11-11', '2026-11-20');
    expect(cache.grades).toEqual([grade]); expect(cache.sectionDates?.grades?.end).toBe('2026-11-10'); expect(cache.sectionDates?.homework?.end).toBe('2026-11-20');
  });
  it('remembers completion when an assignment returns after changing dates', () => {
    const cache = mergeDiary(response, { ...previous, completedIds: ['hw1'] }, '2026-11-01', '2026-11-10');
    const homework = [{ id: 'hw1', subject: 'Математика', teacherName: '', dateGiven: '', dateDue: '', text: '', isCompleted: false, priority: 'normal' as const }];
    expect(mergeDiary({ ...response, homework }, cache, '2026-11-01', '2026-11-10').homework[0].isCompleted).toBe(true);
  });
  it('does not alert on first load or when older grades enter a wider range', () => {
    expect(newMarks(response, null)).toEqual([]);
    expect(newMarks({ ...response, grades: [{ ...grade, id: 'old' }] }, previous)).toEqual([]);
  });
  it('detects new grades and changed values but does not repeat them', () => {
    const changed = { ...response, grades: [{ ...grade, value: '5', numericValue: 5 }] };
    expect(newMarks(changed, previous)).toHaveLength(1);
    expect(newMarks(changed, mergeDiary(changed, previous, '2026-11-01', '2026-11-10'))).toEqual([]);
    expect(newMarks({ ...response, grades: [{ ...grade, id: 'new', date: '2026-11-10T14:00:00' }] }, previous)).toHaveLength(1);
  });
  it('excludes nonnumeric and excluded marks, and refuses unknown weights', () => {
    expect(average([grade, { ...grade, numericValue: 2, includeInAverage: false }])).toBe(4);
    expect(average([{ ...grade, numericValue: null }])).toBeNull();
    expect(average([{ ...grade, weight: null }])).toBeNull();
  });
  it('calculates the minimum extra fives needed for an exact average of 4.5', () => {
    const marks = (values: number[]) => values.map(numericValue => ({ ...grade, numericValue }));
    expect(fivesToReach45(marks([3, 4]))).toBe(4);
    expect(fivesToReach45(marks([4]))).toBe(1);
    expect(fivesToReach45(marks([4, 5]))).toBe(0);
    expect(fivesToReach45(marks([5]))).toBe(0);
    expect(fivesToReach45([...marks([4]), { ...grade, numericValue: 2, includeInAverage: false }])).toBe(1);
    expect(fivesToReach45([{ ...grade, weight: null }])).toBeNull();
    expect(fivesToReach45([{ ...grade, weight: 2 }])).toBeNull();
    expect(fivesToReach45([])).toBeNull();
    expect([1, 4, 5, 11, 21].map(fiveWord)).toEqual(['пятёрку', 'пятёрки', 'пятёрок', 'пятёрок', 'пятёрку']);
  });
});
