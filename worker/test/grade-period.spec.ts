import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentQuarter, currentWeek, gradeRangeChunks, loadPeriodGrades } from '../../src/services/gradePeriodService';
import worker from '../src';
afterEach(() => vi.unstubAllGlobals());
describe('Grade periods', () => {
  it('selects the current school quarter, with its real dates rather than the quarter number on a work', () => {
    const first = { id: '1', type: 'Quarter', name: '1-я четверть', start: '2026-09-01', end: '2026-10-30' };
    const second = { id: '2', type: 'Quarter', name: '2-я четверть', start: '2026-11-05', end: '2026-12-30' };
    expect(currentQuarter([first, second], '2026-11-12')).toEqual(second);
    expect(currentQuarter([first, second], '2026-11-02')).toEqual(first);
    expect(currentQuarter([], '2026-11-12')).toBeNull();
  });
  it('uses Monday to Sunday even when the week crosses a year boundary', () => {
    expect(currentWeek('2026-11-12')).toEqual({ start: '2026-11-09', end: '2026-11-15' });
    expect(currentWeek('2027-01-03')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
  });
  it('covers an entire quarter without missing dates or exceeding the API range', () => {
    expect(gradeRangeChunks({ start: '2026-11-05', end: '2026-12-30' })).toEqual([
      { start: '2026-11-05', end: '2026-12-05' }, { start: '2026-12-06', end: '2026-12-30' },
    ]);
    expect(() => gradeRangeChunks({ start: '2026-11-12', end: '2026-11-01' })).toThrow();
    expect(() => gradeRangeChunks({ start: '2026-02-30', end: '2026-03-01' })).toThrow();
  });
  it('does not show a partial-quarter average if a later portion fails', async () => {
    const load = vi.fn().mockResolvedValueOnce({ ok: true, grades: [{ id: 'old', value: '5' }], warnings: [] })
      .mockResolvedValueOnce({ ok: true, grades: null, warnings: [{ section: 'grades', message: 'Нет доступа' }] });
    await expect(loadPeriodGrades(load, { start: '2026-11-05', end: '2026-12-30' }, new AbortController().signal)).rejects.toThrow('Нет доступа');
  });
  it('uses the school class reporting periods and preserves large period IDs', async () => {
    const fetcher = vi.fn().mockImplementation(async (url: string) => Response.json(url.endsWith('/edu-groups')
      ? [{ id_str: '123', type: 'Grade', status: 'Active' }]
      : [{ id_str: '9876543210123456789', type: 'Quarter', name: '2-я четверть', start: '2026-11-05T00:00:00', finish: '2026-12-30T00:00:00' }]));
    vi.stubGlobal('fetch', fetcher);
    const response = await worker.fetch(new Request('https://app.test/api/periods?personId=1&schoolId=2', { headers: { Authorization: 'Bearer synthetic' } }), {});
    expect(response.status).toBe(200);
    const result = await response.json<{ periods: unknown[] }>();
    expect(result.periods).toEqual([{ id: '9876543210123456789', type: 'Quarter', name: '2-я четверть', start: '2026-11-05', end: '2026-12-30' }]);
    expect(fetcher.mock.calls[1][0]).toContain('edu-groups/123/reporting-periods');
  });
});
