
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'https://dnevnik.gangabass.workers.dev'
).replace(/\/+$/, '');

export interface ApiErrorResponse {
  ok: false;
  error: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}


export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${normalizedPath}`,
      {
        ...options,
        headers,
      }
    );
  } catch {
    throw new ApiError(
      'Не удалось подключиться к серверу. Проверьте интернет и CORS.',
      0
    );
  }

  const responseText = await response.text();

  let data: unknown;

  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new ApiError(
      'Сервер вернул некорректный JSON',
      response.status
    );
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data
        ? String(data.error)
        : `Ошибка HTTP ${response.status}`;

    throw new ApiError(message, response.status);
  }

  return data as T;
}


export interface HealthResponse {
  ok: boolean;
  service: string;
  timestamp: string;
}

export function checkApiHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/health', {
    method: 'GET',
  });
}

export { API_BASE_URL };


export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  schoolName: string;
}

export interface ProfileResponse {
  ok: boolean;
  demo: boolean;
  profile: StudentProfile;
}

export function getProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>('/api/profile');
}
