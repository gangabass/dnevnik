import { normalizeHomework, parseDnevnikJson } from './dnevnik';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: {
    ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  } });
}
class ApiFailure extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function dnevnik(path: string, token: string, params?: URLSearchParams): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`https://api.dnevnik.ru/v2/${path}${params ? `?${params}` : ''}`, {
      headers: { 'Access-Token': token, Accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(20000),
    });
  } catch { throw new ApiFailure('Дневник.ру недоступен. Повторите запрос позже.', 502); }
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'Токен недействителен или истёк. Введите новый токен.',
      403: 'Нет доступа к данным. Проверьте права токена и ID ученика и школы.',
      404: 'Данные не найдены. Проверьте ID ученика и школы.',
      429: 'Дневник.ру ограничил частоту запросов. Повторите позже.',
    };
    throw new ApiFailure(messages[response.status] ?? 'Ошибка сервиса Дневник.ру.',
      [401, 403, 404, 429].includes(response.status) ? response.status : 502);
  }
  try {
    const result = parseDnevnikJson(await response.text());
    if (result && typeof result === 'object' && ('error' in result || ('type' in result && typeof result.type === 'string' && /^(api|parameter|authorization)/i.test(result.type)))) {
      throw new Error('API error');
    }
    return result;
  } catch { throw new ApiFailure('Дневник.ру вернул неожиданный ответ.', 502); }
}
function validDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    if (url.pathname === '/') return json({ service: 'Dnevnik.ru API', status: 'running', version: '0.2.0' });
    if (url.pathname === '/api/health') return json({ ok: true, service: 'dnevnik-worker', timestamp: new Date().toISOString() });
    if (!['/api/profile', '/api/homework'].includes(url.pathname)) return json({ error: 'Not found' }, 404);
    const authorization = request.headers.get('Authorization') ?? '';
    const token = /^Bearer ([^\s\x00-\x1f]+)$/.exec(authorization)?.[1];
    if (!token || token.length > 4096) return json({ error: 'Введите токен Дневник.ру.' }, 401);
    try {
      if (url.pathname === '/api/profile') {
        const profile = await dnevnik('users/me', token);
        if (!profile || typeof profile !== 'object' || !('id' in profile || 'id_str' in profile)) {
          throw new ApiFailure('Дневник.ру не вернул профиль пользователя.', 502);
        }
        // Return only fields needed by the PWA, never the full account object.
        const user = profile as Record<string, unknown>;
        return json({ ok: true, profile: {
          id: String(user.id_str ?? user.id),
          name: String(user.fullName ?? user.shortName ?? [user.firstName, user.lastName].filter(Boolean).join(' ') ?? ''),
        } });
      }
      const person = url.searchParams.get('personId') ?? '';
      const school = url.searchParams.get('schoolId') ?? '';
      const start = url.searchParams.get('startDate');
      const end = url.searchParams.get('endDate');
      if (!/^[1-9]\d{0,19}$/.test(person) || !/^[1-9]\d{0,19}$/.test(school)) return json({ error: 'Укажите корректные ID ученика и школы.' }, 400);
      if (!validDate(start) || !validDate(end) || start > end || Date.parse(end) - Date.parse(start) > 31 * 86400000) {
        return json({ error: 'Выберите период до 31 дня с корректными датами.' }, 400);
      }
      const params = new URLSearchParams({ startDate: `${start}T00:00:00`, endDate: `${end}T23:59:59.999999` });
      const result = await dnevnik(`persons/${person}/school/${school}/homeworks`, token, params);
      return json({ ok: true, homework: normalizeHomework(result) });
    } catch (error) {
      if (error instanceof ApiFailure) return json({ error: error.message }, error.status);
      return json({ error: 'Не удалось обработать ответ Дневник.ру.' }, 502);
    }
  },
} satisfies ExportedHandler<Env>;
