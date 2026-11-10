import { normalizeDiary, studentChoices } from './diary';
import type { DiaryWarning } from '../../shared/diary';
import { row, rows, id, key, normalizeHomework, parseDnevnikJson } from './dnevnik';

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
      // Workers supports manual/follow only; redirect: 'error' throws before sending.
      redirect: 'manual', signal: AbortSignal.timeout(20000),
    });
  } catch { throw new ApiFailure('Дневник.ру недоступен. Повторите запрос позже.', 502); }
  // Never forward the token to a redirect destination.
  if (response.status >= 300 && response.status < 400) {
    throw new ApiFailure('Дневник.ру вернул перенаправление вместо ответа API. Запрос остановлен.', 502);
  }
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
  let result: unknown;
  try { result = parseDnevnikJson(await response.text()); }
  catch { throw new ApiFailure('Дневник.ру вернул неожиданный ответ.', 502); }
  const errorType = row(result).type;
  if (typeof errorType === 'string' && /^(invalidToken|tokenRequired|authorization)/i.test(errorType)) {
    throw new ApiFailure('Токен недействителен или истёк. Введите новый токен.', 401);
  }
  if (result && typeof result === 'object' && ('error' in result || (typeof errorType === 'string' && /^(api|parameter)/i.test(errorType)))) {
    throw new ApiFailure('Дневник.ру вернул ошибку API.', 502);
  }
  return result;
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
    if (url.pathname === '/') return json({ service: 'Dnevnik.ru API', status: 'running', version: '0.3.0' });
    if (url.pathname === '/api/health') return json({ ok: true, service: 'dnevnik-worker', timestamp: new Date().toISOString() });
    if (!['/api/profile', '/api/homework', '/api/context', '/api/diary'].includes(url.pathname)) return json({ error: 'Not found' }, 404);
    const authorization = request.headers.get('Authorization') ?? '';
    const token = /^Bearer ([^\s\x00-\x1f]+)$/.exec(authorization)?.[1];
    if (!token || token.length > 4096) return json({ error: 'Введите токен Дневник.ру.' }, 401);
    try {
      if (url.pathname === '/api/context') {
        return json({ ok: true, students: studentChoices(await dnevnik('users/me/context', token)) });
      }
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
      if (url.pathname === '/api/diary') {
        const accessToken = token;
        const warnings: DiaryWarning[] = [];
        async function optional(section: DiaryWarning['section'], path: string, query?: URLSearchParams): Promise<unknown | null> {
          try { return await dnevnik(path, accessToken, query); }
          catch (error) {
            if (error instanceof ApiFailure && error.status === 401) throw error;
            warnings.push({ section, message: error instanceof ApiFailure ? error.message : 'Не удалось загрузить данные.' });
            return null;
          }
        }
        const [homework, marks, groupData, schoolData] = await Promise.all([
          optional('homework', `persons/${person}/school/${school}/homeworks`, params),
          optional('grades', `persons/${person}/schools/${school}/marks/${start}T00:00:00/${end}T23:59:59.999999`),
          optional('schedule', `persons/${person}/schools/${school}/edu-groups`),
          optional('profile', `schools/${school}`),
        ]);
        if (groupData !== null && !Array.isArray(groupData)) throw new ApiFailure('Неожиданный формат учебных групп.', 502);
        if (marks !== null && !Array.isArray(marks)) throw new ApiFailure('Неожиданный формат оценок.', 502);
        const groups = rows(groupData).filter(group => group.status !== 'Inactive' && /^[1-9]\d{0,19}$/.test(key(group)));
        const schedules = (await Promise.all(groups.map(group => optional('schedule', `persons/${person}/groups/${key(group)}/schedules`, params)))).filter(value => value !== null);
        if (!groups.length && groupData !== null) warnings.push({ section: 'schedule', message: 'Учебная группа не найдена.' });
        if (schedules.some(schedule => !Array.isArray(row(schedule).days))) throw new ApiFailure('Неожиданный формат расписания.', 502);
        const schoolInfo = row(schoolData);
        const normalized = normalizeDiary(marks, schedules, homework, groups, schoolInfo.uses_weighted_avg !== false);
        return json({ ok: true,
          student: { schoolName: String(schoolInfo.name ?? ''), className: groups.map(group => String(group.name ?? '')).join(', '), usesWeightedAverage: schoolInfo.uses_weighted_avg !== false },
          homework: homework === null ? null : normalizeHomework(homework),
          grades: marks === null ? null : normalized.grades,
          schedule: schedules.length ? normalized.schedule : null,
          warnings,
        });
      }
      const result = await dnevnik(`persons/${person}/school/${school}/homeworks`, token, params);
      return json({ ok: true, homework: normalizeHomework(result) });
    } catch (error) {
      if (error instanceof ApiFailure) return json({ error: error.message }, error.status);
      return json({ error: 'Не удалось обработать ответ Дневник.ру.' }, 502);
    }
  },
} satisfies ExportedHandler<Env>;
