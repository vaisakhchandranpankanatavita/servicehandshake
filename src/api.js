/* Thin fetch wrapper for the Fixzy API. The access token lives in memory only; the refresh token is an httpOnly cookie. */
const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let token = null;
let refreshing = null;

const messageOf = (body, status) => {
  const m = body?.message;
  if (Array.isArray(m)) return m[0];
  if (typeof m === 'string') return m;
  return status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed.';
};

async function send(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageOf(data, res.status));
  return data;
}

export const setToken = (t) => { token = t; };

/* Exchange the refresh cookie for a new access token. Concurrent callers share one request, since refresh tokens rotate. */
export function refresh() {
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then((s) => { token = s.accessToken; return s; })
    .catch((e) => { token = null; if (e.status && e.status !== 401) throw e; return null; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function api(path, opts) {
  try {
    return await send(path, opts);
  } catch (e) {
    if (e.status !== 401 || /^\/auth\/(login|register|refresh|logout)/.test(path)) throw e;
    if (!(await refresh())) throw e;
    return send(path, opts);
  }
}

export const signInResult = (s) => { token = s.accessToken; return s.user; };
