import type { DiaryResponse, StudentChoice, ReportingPeriod } from '../../shared/diary';
import type { HomeworkItem } from '../types';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://gangabass.duckdns.org/dnevnik-api').replace(/\/+$/, '');
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; }
}
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(`${API_BASE_URL}${path}`, { ...options, cache: 'no-store' }); }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Не удалось подключиться к серверу. Проверьте интернет.', 0);
  }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new ApiError('Сервер вернул некорректный ответ.', response.status); }
  if (!response.ok) throw new ApiError(
    typeof data === 'object' && data && 'error' in data ? String(data.error) : `Ошибка HTTP ${response.status}`, response.status);
  return data as T;
}
export function checkApiHealth() {
  return apiRequest<{ ok: boolean; service: string; timestamp: string }>('/api/health');
}
export function getProfile(token: string, signal?: AbortSignal) {
  return apiRequest<{ ok: true; profile: { id: string; name: string } }>('/api/profile', {
    headers: { Authorization: `Bearer ${token}` }, signal,
  });
}
export function getHomework(token: string, personId: string, schoolId: string, startDate: string, endDate: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ personId, schoolId, startDate, endDate });
  return apiRequest<{ ok: true; homework: HomeworkItem[] }>(`/api/homework?${params}`, {
    headers: { Authorization: `Bearer ${token}` }, signal,
  });
}
export { API_BASE_URL };
export function getReportingPeriods(token: string, personId: string, schoolId: string, signal?: AbortSignal) {
  return apiRequest<{ ok: true; periods: ReportingPeriod[] }>(`/api/periods?${new URLSearchParams({ personId, schoolId })}`, { headers: { Authorization: `Bearer ${token}` }, signal });
}

export function getStudents(token: string, signal?: AbortSignal) {
  return apiRequest<{ ok: true; students: StudentChoice[] }>('/api/context', { headers: { Authorization: `Bearer ${token}` }, signal });
}
export function getDiary(token: string, personId: string, schoolId: string, startDate: string, endDate: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ personId, schoolId, startDate, endDate });
  return apiRequest<DiaryResponse>(`/api/diary?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal });
}
