import { ApiError, api, signInResult } from './api.js';
import { startSession } from './store.js';

/* Each call resolves to an error message, or null on success (what the auth forms expect). */
async function enter(path, body) {
  try {
    const s = await api(path, { method: 'POST', body });
    await startSession(signInResult(s));
    return null;
  } catch (e) {
    if (e instanceof ApiError) return e.status === 400 && /email must be/i.test(e.message) ? 'Enter a valid email address.' : e.message;
    throw e;
  }
}

export const register = ({ name, email, phone, password }) => enter('/auth/register', { name: name.trim(), email: email.trim(), phone: phone.trim(), password });
export const login = ({ email, password }) => enter('/auth/login', { email: email.trim(), password });

export const passwordStrength = (pw) => {
  let n = 0;
  if (pw.length >= 8) n++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++;
  if (/\d/.test(pw)) n++;
  if (/[^A-Za-z0-9]/.test(pw)) n++;
  return n; // 0-4
};

/* Only same-site pages from this whitelist are valid redirect targets (no open redirect). */
const REDIRECTS = ['track', 'orders', 'dashboard', 'checkout', 'service-request', 'shop', 'services'];
export function redirectTarget(fallback = '/dashboard') {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('redirect');
  if (!REDIRECTS.includes(slug)) return fallback;
  const sid = params.get('service_id');
  return `/${slug}${slug === 'service-request' && /^\d+$/.test(sid || '') ? `?service_id=${sid}` : ''}`;
}

/* Send signed-out visitors to login, remembering where they were headed. */
export function loginUrl(slug, extra = '') {
  return `/login?redirect=${slug}${extra}`;
}
