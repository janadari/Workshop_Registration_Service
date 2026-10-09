export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(
      'Unable to reach the server. Check that the backend is running.',
      0,
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message =
      error.message ||
      (response.status === 401
        ? 'Your session has expired. Please sign in again.'
        : response.status === 403
          ? 'You do not have permission to perform this action.'
          : 'Something went wrong. Please try again.');

    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;

  return (await response.json().catch(() => ({}))) as T;
}
