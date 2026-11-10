import { row, parseDnevnikJson } from './dnevnik';
export class ApiFailure extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function dnevnik(path: string, token: string, params?: URLSearchParams, body?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`https://api.dnevnik.ru/v2/${path}${params ? `?${params}` : ''}`, {
      headers: { 'Access-Token': token, Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : JSON.stringify(body),
      // Workers supports manual/follow only; redirect: 'error' throws before sending.
      redirect: 'manual', signal: AbortSignal.timeout(20000),
    });
  } catch { throw new ApiFailure('Дневник.ру недоступен. Повторите запрос позже.', 502); }
  // Never forward the token to a redirect destination.
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new ApiFailure('Дневник.ру вернул перенаправление вместо ответа API. Запрос остановлен.', 502);
  }
  if (!response.ok) {
    await response.body?.cancel();
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
