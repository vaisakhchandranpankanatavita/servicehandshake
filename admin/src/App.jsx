import { useEffect, useState } from 'react';
import { login, logout, refresh } from './api.js';
import { Toaster } from './ui.jsx';
import { Bookings, Coupons, Dashboard, Inbox, Orders, Products, Providers, Services, Users } from './pages.jsx';

const ROUTES = [
  ['dashboard', 'Dashboard', Dashboard], ['bookings', 'Bookings', Bookings], ['orders', 'Orders', Orders],
  ['users', 'Users', Users], ['services', 'Services', Services], ['pros', 'Pros', Providers],
  ['products', 'Products', Products], ['coupons', 'Coupons', Coupons], ['inbox', 'Inbox', Inbox],
];

const useHash = () => {
  const get = () => location.hash.slice(2) || 'dashboard';
  const [h, setH] = useState(get);
  useEffect(() => { const f = () => setH(get()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};

function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { onDone(await login(email, password)); } catch (e2) { setErr(e2.message); setBusy(false); }
  };
  return <div className="login"><form className="card" onSubmit={submit}>
    <h1>Fixzy Admin</h1><p className="sub">Sign in with an admin account.</p>
    <label className="field"><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {err && <p className="err" role="alert">{err}</p>}
    <button className="btn primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form></div>;
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking session
  const route = useHash();

  useEffect(() => { refresh().then((u) => setUser(u.role === 'ADMIN' ? u : null), () => setUser(null)); }, []);

  if (user === undefined) return null;
  if (!user) return <><Login onDone={setUser} /><Toaster /></>;

  const [, , Page] = ROUTES.find((r) => r[0] === route) ?? ROUTES[0];
  return <div className="shell">
    <nav className="side" aria-label="Admin">
      <div className="logo">Fixzy Admin</div>
      {ROUTES.map(([id, name]) => <a key={id} href={`#/${id}`} className={route === id ? 'on' : ''} aria-current={route === id ? 'page' : undefined}>{name}</a>)}
      <div className="spacer" />
      <div className="who">{user.email}</div>
      <a href="#/" onClick={async (e) => { e.preventDefault(); await logout(); setUser(null); }}>Sign out</a>
    </nav>
    <main className="main"><Page me={user} /></main>
    <Toaster />
  </div>;
}
