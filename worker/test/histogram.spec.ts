import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeHistogram } from '../src/histogram';
import { histogramGroups, peopleCount } from '../../src/services/histogramService';
import worker from '../src';
afterEach(() => vi.unstubAllGlobals());
const groups = [
  { markNumber: 0, marks: [{ value: '5', count: 3 }, { value: '4', count: 10 }] },
  { markNumber: 1, marks: [{ value: '5', count: 2 }] },
];
describe('Anonymous grade histogram', () => {
  it('keeps double-grade distributions separate and selects the exact mark position', () => {
    expect(histogramGroups(groups, 0)).toEqual([groups[0]]);
    expect(histogramGroups(groups, 1)).toEqual([groups[1]]);
    expect(histogramGroups(groups, 2)).toEqual([]);
    expect(histogramGroups(groups)).toEqual(groups);
  });
  it('uses correct Russian plurals for people counts', () => {
    expect([1, 3, 10, 11, 21, 22, 25].map(peopleCount)).toEqual(['1 человек', '3 человека', '10 человек', '11 человек', '21 человек', '22 человека', '25 человек']);
  });
  it('returns only aggregated values and counts, dropping unexpected upstream personal fields', () => {
    const result = normalizeHistogram({ person: 'private', markNumbers: [{ markNumber: 0, name: 'private', marks: [{ value: '4', count: 10, person: 'private' }, { value: '5', count: 3 }] }] });
    expect(result).toEqual([groups[0]]);
    expect(JSON.stringify(result)).not.toContain('private');
    expect(() => normalizeHistogram({ markNumbers: [{ markNumber: 0, marks: [{ value: '5', count: -1 }] }] })).toThrow();
    expect(() => normalizeHistogram({})).toThrow();
  });
  it('requests the dedicated anonymized endpoint, preserving a large work ID', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ markNumbers: groups }));
    vi.stubGlobal('fetch', fetcher);
    const response = await worker.fetch(new Request('https://app.test/api/marks/histogram?workId=9876543210123456789', { headers: { Authorization: 'Bearer synthetic' } }), {});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, groups });
    expect(fetcher.mock.calls[0][0]).toBe('https://api.dnevnik.ru/v2/works/9876543210123456789/marks/histogram');
  });
  it('requires a token and rejects invalid work IDs before querying upstream', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect((await worker.fetch(new Request('https://app.test/api/marks/histogram?workId=1'), {})).status).toBe(401);
    expect((await worker.fetch(new Request('https://app.test/api/marks/histogram?workId=invalid', { headers: { Authorization: 'Bearer synthetic' } }), {})).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps upstream access failures as failures instead of showing a fabricated zero distribution', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    expect((await worker.fetch(new Request('https://app.test/api/marks/histogram?workId=1', { headers: { Authorization: 'Bearer synthetic' } }), {})).status).toBe(403);
  });
});
