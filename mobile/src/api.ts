import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const API = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api');
const ASSETS = process.env.EXPO_PUBLIC_ASSET_URL || 'http://localhost:5173';
export const img = (p?: string) => (!p ? undefined : /^https?:/.test(p) ? p : ASSETS + p);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const KEY = 'fixzy_refresh';
/* SecureStore has no web implementation; fall back to localStorage there. */
const store = {
  get: async (): Promise<string | null> => (Platform.OS === 'web' ? localStorage.getItem(KEY) : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => { if (Platform.OS === 'web') localStorage.setItem(KEY, v); else await SecureStore.setItemAsync(KEY, v); },
  del: async () => { if (Platform.OS === 'web') localStorage.removeItem(KEY); else await SecureStore.deleteItemAsync(KEY); },
};

let access: string | null = null;
let refreshing: Promise<any> | null = null;

const messageOf = (b: any, s: number) =>
  Array.isArray(b?.message) ? b.message[0] : typeof b?.message === 'string' ? b.message : s >= 500 ? 'Something went wrong on our side. Try again.' : 'Request failed.';

async function send(path: string, method = 'GET', body?: any) {
  let res: Response;
  try {
    res = await fetch(API + path, {
      method,
      headers: { 'x-client': 'mobile', ...(body ? { 'content-type': 'application/json' } : {}), ...(access ? { authorization: `Bearer ${access}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageOf(data, res.status));
  return data;
}

async function adopt(r: any) {
  access = r.accessToken;
  await store.set(r.refreshToken);
  return r.user;
}

/* Restore a session from the stored refresh token. Concurrent callers share one request, since tokens rotate. */
export function restore(): Promise<any | null> {
  refreshing ??= (async () => {
    const t = await store.get();
    if (!t) return null;
    try { return await adopt(await send('/auth/refresh', 'POST', { refreshToken: t })); }
    catch (e: any) { if (e.status === 401) await store.del(); access = null; return null; }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

export async function api(path: string, method = 'GET', body?: any) {
  try { return await send(path, method, body); }
  catch (e: any) {
    if (e.status !== 401 || path.startsWith('/auth/')) throw e;
    if (!(await restore())) throw e;
    return send(path, method, body);
  }
}

export const signIn = async (email: string, password: string) => adopt(await send('/auth/login', 'POST', { email, password }));
export const signUp = async (d: { name: string; email: string; phone: string; password: string }) => adopt(await send('/auth/register', 'POST', d));
export async function signOut() {
  const t = await store.get();
  await send('/auth/logout', 'POST', { refreshToken: t }).catch(() => {});
  await store.del();
  access = null;
}
