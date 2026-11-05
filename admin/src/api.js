/* Fetch wrapper: access token in memory, refresh token is the httpOnly cookie set by the API. */
const BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let token = null;
let refreshing = null;
export const setToken = (t) => { token = t; };

const messageOf = (b, s) => (Array.isArray(b?.message) ? b.message[0] : typeof b?.message === 'string' ? b.message : s >= 500 ? 'Server error. Try again.' : 'Request failed.');

async function send(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method, credentials: 'include',
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new ApiError(0, 'Can’t reach the server.'); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageOf(data, res.status));
  return data;
}

export function refresh() {
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then((r) => { token = r.accessToken; return r.user; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export async function api(path, opts) {
  try { return await send(path, opts); }
  catch (e) {
    if (e.status !== 401 || path.startsWith('/auth/')) throw e;
    await refresh();
    return send(path, opts);
  }
}

export async function login(email, password) {
  const r = await send('/auth/login', { method: 'POST', body: { email, password } });
  if (r.user.role !== 'ADMIN') {
    await send('/auth/logout', { method: 'POST' }).catch(() => {});
    throw new ApiError(403, 'This account does not have admin access.');
  }
  token = r.accessToken;
  return r.user;
}

export async function logout() {
  await send('/auth/logout', { method: 'POST' }).catch(() => {});
  token = null;
}
