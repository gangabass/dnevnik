import { afterEach, describe, it, expect, vi } from 'vitest';
import worker from '../src';
import { normalizeHomework, parseDnevnikJson } from '../src/dnevnik';

const SELF = { fetch: (url: string, options?: RequestInit) => worker.fetch(new Request(url, options), {}) };
const auth = { Authorization: 'Bearer test-token' };
const homeworkUrl = 'https://example.com/api/homework?personId=1000017127150&schoolId=1000006746179&startDate=2026-11-10&endDate=2026-11-15';
const fixture = `{
  "works":[{"id":2555795349104931316,"type":"Homework","subjectId":1853734415738243982,"lesson":2553261932580584582,"text":"Задание №241","targetDate":"2026-11-11T00:00:00","files":[132052344]}],
  "subjects":[{"id":1853734415738243982,"name":"Алгебра"}],
  "lessons":[{"id":2553261932580584582,"teachers":[1000014552669]}],
  "teachers":[{"id":1000014552669,"shortName":"Учитель"}],
  "files":[{"id":132052344,"name":"Презентация","size":2048,"type":"Pdf","downloadUrl":"https://b3.csdnevnik.ru/example.pdf"}]
}`;
afterEach(() => vi.unstubAllGlobals());

describe('Dnevnik API', () => {
  it('reports health without authentication', async () => {
    const response = await SELF.fetch('https://example.com/api/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ ok: true, service: 'dnevnik-worker' });
  });
  it('requires a token for personal routes', async () => {
    for (const path of ['/api/profile', '/api/homework']) {
      const response = await SELF.fetch(`https://example.com${path}`);
      expect(response.status).toBe(401);
    }
  });
  it('handles authenticated CORS preflight', async () => {
    const response = await SELF.fetch('https://example.com/api/homework', { method: 'OPTIONS' });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });
  it('rejects unsupported methods and unknown routes', async () => {
    expect((await SELF.fetch('https://example.com/api/profile', { method: 'POST' })).status).toBe(405);
    expect((await SELF.fetch('https://example.com/api/missing')).status).toBe(404);
  });
  it('rejects invalid IDs and dates before contacting Dnevnik', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    for (const url of [
      homeworkUrl.replace('personId=1000017127150', 'personId=../users'),
      homeworkUrl.replace('2026-11-10', '2026-02-30'),
      homeworkUrl.replace('2026-11-15', '2026-12-25'),
      homeworkUrl.replace('2026-11-15', '2026-11-09'),
    ]) expect((await worker.fetch(new Request(url, { headers: auth }), {})).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('passes the token only in the upstream header and requests the selected child', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(fixture)); vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(new Request(homeworkUrl, { headers: auth }), {});
    expect(response.status).toBe(200);
    const [address, options] = upstream.mock.calls[0];
    const url = new URL(address);
    expect(url.origin).toBe('https://api.dnevnik.ru');
    expect(url.pathname).toBe('/v2/persons/1000017127150/school/1000006746179/homeworks');
    expect(url.searchParams.get('endDate')).toBe('2026-11-15T23:59:59.999999');
    expect(address).not.toContain('test-token');
    expect(options.headers['Access-Token']).toBe('test-token');
    expect(options.redirect).toBe('error');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json<{ homework: { id: string; subject: string; teacherName: string; files: { url: string }[] }[] }>();
    expect(body.homework[0]).toMatchObject({ id: '2555795349104931316', subject: 'Алгебра', teacherName: 'Учитель' });
    expect(body.homework[0].files[0].url).toBe('https://b3.csdnevnik.ru/example.pdf');
  });
  it('returns only the required profile fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"id":1000000000001,"shortName":"Родитель","phone":"private"}')));
    const response = await worker.fetch(new Request('https://example.com/api/profile', { headers: auth }), {});
    expect(await response.json()).toEqual({ ok: true, profile: { id: '1000000000001', name: 'Родитель' } });
  });
  it.each([401, 403, 404, 429, 500])('handles upstream HTTP %i without leaking the body or token', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret upstream details', { status })));
    const response = await worker.fetch(new Request(homeworkUrl, { headers: auth }), {});
    expect(response.status).toBe(status === 500 ? 502 : status);
    const body = await response.text();
    expect(body).not.toContain('secret'); expect(body).not.toContain('test-token');
  });
  it('handles network and unexpected API responses', async () => {
    for (const mock of [
      vi.fn().mockRejectedValue(new Error('secret network error')),
      vi.fn().mockResolvedValue(new Response('<html>not JSON</html>')),
      vi.fn().mockResolvedValue(new Response('{"type":"apiServerError"}')),
      vi.fn().mockResolvedValue(new Response('{"unexpected":true}')),
    ]) {
      vi.stubGlobal('fetch', mock);
      expect((await worker.fetch(new Request(homeworkUrl, { headers: auth }), {})).status).toBe(502);
    }
  });
});
describe('Dnevnik response conversion', () => {
  it('preserves large numeric references and leaves strings and decimals intact', () => {
    expect(parseDnevnikJson('{"id":2555795349104931316,"text":"2555795349104931316 and \\"quoted\\"","value":4.5}')).toEqual({
      id: '2555795349104931316', text: '2555795349104931316 and "quoted"', value: 4.5,
    });
  });
  it('filters non-homework and unsafe attachment URLs', () => {
    const data = { works: [
      { id: '1', type: 'Test' },
      { id: '2', type: 'Homework', files: [1] },
    ], files: [{ id: 1, downloadUrl: 'javascript:alert(1)', pageUrl: 'https://evil.example/private' }] };
    const result = normalizeHomework(data);
    expect(result).toHaveLength(1);
    expect(result[0].files[0].url).toBeUndefined();
  });
});
