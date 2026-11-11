import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizeDiary, studentChoices } from '../src/diary';
import { parseDnevnikJson } from '../src/dnevnik';
import worker from '../src';
const person = '1000000000001';
const school = '1000000000002';
const group = '2519382332901597278';
const lesson = '2553261932580584582';
const work = '2555795349104931316';
const mark = '2554348713925291122';
const subject = '1853734415738243982';
const groups = [{ id: group, name: '8А', status: 'Active', subjects: [{ id: subject, name: 'Алгебра' }] }];
const marks = [{ id: mark, type: 'Mark5', value: '4', textValue: '4', work, lesson, date: '2026-11-06T12:00:00', workType: '100', use_avg_calc: true }];
const schedule = { days: [{ date: '2026-11-06T00:00:00',
  lessons: [{ id: lesson, number: 1, subjectId: subject, title: 'Уравнения', date: '2026-11-06T00:00:00', hours: '14:00 - 14:40', place: '103', teachers: ['10'] }],
  works: [{ id: work, lesson, subjectId: subject, periodNumber: 2, markCount: 2 }],
  teachers: [{ person: { id: '10', shortName: 'Учитель' } }], workTypes: [{ id: '100', name: 'Самостоятельная работа' }],
} ] };
const homework = { works: [{ id: '20', lesson, subjectId: subject, type: 'Homework', text: 'Упр. 10', targetDate: '2026-11-06T00:00:00' }] };
const url = `https://app.test/api/diary?personId=${person}&schoolId=${school}&startDate=2026-11-01&endDate=2026-11-10`;
const auth = { Authorization: 'Bearer synthetic-token' };
afterEach(() => vi.unstubAllGlobals());
function upstream(path: string) {
  const pathname = new URL(path).pathname;
  if (pathname.endsWith('/edu-groups')) return groups;
  if (pathname.endsWith('/schedules')) return schedule;
  if (pathname.endsWith('/homeworks')) return homework;
  if (pathname.includes('/marks/')) return marks;
  if (pathname === `/v2/schools/${school}`) return { name: 'Школа', uses_weighted_avg: false };
  throw new Error('Unexpected endpoint');
}
describe('Diary normalization', () => {
  it('joins marks with lessons, works, nested teachers and work types', () => {
    const result = normalizeDiary(marks, [schedule], homework, groups, false);
    expect(result.grades[0]).toMatchObject({ id: mark, workId: work, subject: 'Алгебра', numericValue: 4, weight: 1, period: 2, teacherName: 'Учитель', workType: 'Самостоятельная работа', topic: 'Уравнения' });
    expect(result.schedule[0].lessons[0]).toMatchObject({ hours: '14:00 - 14:40', room: '103', homework: 'Упр. 10' });
  });
  it('does not invent weights, quarters, numeric values or lesson times', () => {
    const result = normalizeDiary([{ id: '1', type: 'Mark5', value: 'Н', use_avg_calc: false }], [{ days: [{ date: '2026-11-06', lessons: [{ id: '2' }] }] }], null, [], true);
    expect(result.grades[0]).toMatchObject({ value: 'Н', numericValue: null, weight: null, period: null, includeInAverage: false });
    expect(result.schedule[0].lessons[0].hours).toBe('');
  });
  it('preserves IDs and deduplicates marks and lessons from repeated groups', () => {
    const numeric = parseDnevnikJson(JSON.stringify(schedule).replace(`"${lesson}"`, lesson));
    const result = normalizeDiary(marks, [numeric, numeric], homework, groups, false);
    expect(result.schedule[0].lessons).toHaveLength(1);
    expect(result.schedule[0].lessons[0].id).toBe(lesson);
    expect(result.grades).toHaveLength(1);
  });
  it('discovers children with each school and the matching class', () => {
    const result = studentChoices({ children: [{ personId: person, shortName: 'Ребёнок', schoolIds: [school], groupIds: [group] }], schools: [{ id: school, name: 'Школа' }], eduGroups: [{ id: group, schoolID: school, name: '8А' }] });
    expect(result).toEqual([{ personId: person, schoolId: school, studentName: 'Ребёнок', schoolName: 'Школа', className: '8А' }]);
  });
});
describe('Diary endpoint', () => {
  it('loads the main group and returns all sections', async () => {
    const fetcher = vi.fn().mockImplementation(async (path: string, options: RequestInit) => {
      expect(options.redirect).toBe('manual');
      return Response.json(upstream(path));
    }); vi.stubGlobal('fetch', fetcher);
    const response = await worker.fetch(new Request(url, { headers: auth }), {});
    expect(response.status).toBe(200);
    const data = await response.json<{ grades: unknown[]; schedule: unknown[]; homework: unknown[]; warnings: unknown[] }>();
    expect(data.grades).toHaveLength(1); expect(data.schedule).toHaveLength(1); expect(data.homework).toHaveLength(1); expect(data.warnings).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(fetcher.mock.calls.every(([path]) => !path.includes('/timetables'))).toBe(true);
  });
  it('keeps other sections when marks are forbidden', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (path: string) => path.includes('/marks/') ? new Response(null, { status: 403 }) : Response.json(upstream(path))));
    const response = await worker.fetch(new Request(url, { headers: auth }), {});
    const data = await response.json<{ grades: unknown; homework: unknown[]; schedule: unknown[]; warnings: { section: string }[] }>();
    expect(response.status).toBe(200); expect(data.grades).toBeNull(); expect(data.homework).toHaveLength(1); expect(data.schedule).toHaveLength(1); expect(data.warnings[0].section).toBe('grades');
  });
  it('rejects an expired token instead of treating it as partial success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    expect((await worker.fetch(new Request(url, { headers: auth }), {})).status).toBe(401);
  });
});
