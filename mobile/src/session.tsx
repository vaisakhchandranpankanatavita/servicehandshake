import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, restore, signIn, signOut, signUp } from './api';

export type User = { id: string; name: string; email: string; phone: string; role: string };
type Ctx = {
  user: User | null | undefined; // undefined = still restoring
  login: (e: string, p: string) => Promise<void>;
  register: (d: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (d: { name: string; phone: string }) => Promise<void>;
};
const C = createContext<Ctx>(null as any);
export const useSession = () => useContext(C);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => { restore().then(setUser, () => setUser(null)); }, []);
  const login = useCallback(async (e: string, p: string) => setUser(await signIn(e.trim().toLowerCase(), p)), []);
  const register = useCallback(async (d: any) => setUser(await signUp({ ...d, email: d.email.trim().toLowerCase() })), []);
  const logout = useCallback(async () => { await signOut(); setUser(null); }, []);
  const updateProfile = useCallback(async (d: any) => setUser(await api('/auth/me', 'PATCH', d)), []);
  const v = useMemo(() => ({ user, login, register, logout, updateProfile }), [user, login, register, logout, updateProfile]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
