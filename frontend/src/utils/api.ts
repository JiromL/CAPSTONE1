export function api(path: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
  return `${base}${path}`;
}

let _refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(api('/api/auth/refresh'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    if (!res.ok) return null;
    const { access_token } = await res.json();
    localStorage.setItem('token', access_token);
    return access_token;
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper that automatically retries once after refreshing the access
 * token when the server responds with 401. On second failure it clears
 * tokens and redirects to /login?expired=true.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status !== 401) return res;

  // Deduplicate concurrent refresh calls
  if (!_refreshing) {
    _refreshing = refreshAccessToken().finally(() => { _refreshing = null; });
  }
  const newToken = await _refreshing;

  if (!newToken) {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
      window.location.href = '/login?expired=true';
    }
    return res;
  }

  headers.set('Authorization', `Bearer ${newToken}`);
  return fetch(input, { ...init, headers });
}
