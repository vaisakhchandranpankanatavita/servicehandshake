import { useSyncExternalStore } from 'react';
import { api, refresh, setToken } from './api.js';

/* Client state. Cart and recent searches are local; everything else mirrors the API and is loaded after sign-in. */
const KEY = 'fixzy:v2';
const PERSISTED = ['user', 'cart', 'recent', 'wishlist'];
const empty = { user: null, cart: [], recent: [], wishlist: [], bookings: [], notifications: [], reviewsByKey: {}, account: 'loading' };

try { localStorage.removeItem('fixzy:v1'); } catch { /* storage unavailable */ }

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...empty, ...Object.fromEntries(PERSISTED.filter((k) => k in saved).map((k) => [k, saved[k]])) };
  } catch { return { ...empty }; }
};
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(PERSISTED.map((k) => [k, s[k]])))); } catch { /* storage unavailable */ } };

let state = load();
const listeners = new Set();

export const getState = () => state;
export const setState = (patch) => {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  save(state);
  listeners.forEach((l) => l());
};
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  const next = load();
  state = { ...state, ...Object.fromEntries(PERSISTED.map((k) => [k, next[k]])) };
  listeners.forEach((l) => l());
});

export const useStore = (select = (s) => s) => useSyncExternalStore(subscribe, () => select(state));

/* ---------- API shape -> UI shape ---------- */
const toBooking = (b, owner) => ({
  id: b.id, status: b.status.toLowerCase(), serviceId: b.serviceId, providerId: b.providerId, day: b.day, slot: b.slot,
  name: b.name, phone: b.phone, address: b.address, notes: b.notes, estimate: b.estimate, createdAt: Date.parse(b.createdAt),
  reviewed: !!b.review, owner,
});
const toNote = (n, owner) => ({ id: n.id, text: n.text, href: n.href, read: n.read, at: Date.parse(n.createdAt), owner });
const toReview = (r, kind, target) => ({ id: r.id, kind, target, name: r.user?.name || 'Customer', rating: r.rating, text: r.text, at: Date.parse(r.createdAt) });

const email = () => state.user?.email;
const upsertBooking = (b) => setState((s) => {
  const next = toBooking(b, email());
  const hit = s.bookings.some((x) => x.id === next.id);
  return { bookings: hit ? s.bookings.map((x) => (x.id === next.id ? { ...x, ...next } : x)) : [next, ...s.bookings] };
});

export async function loadNotifications() {
  if (!state.user) return;
  const rows = await api('/notifications');
  setState({ notifications: rows.map((n) => toNote(n, email())) });
}

async function loadAccount() {
  const owner = email();
  const [bookings, notes, wishlist] = await Promise.allSettled([api('/bookings'), api('/notifications'), api('/wishlist')]);
  const localWishlist = state.wishlist;
  const serverIds = wishlist.status === 'fulfilled' ? wishlist.value.map((p) => p.id) : state.wishlist;
  setState({
    bookings: bookings.status === 'fulfilled' ? bookings.value.map((b) => toBooking(b, owner)) : [],
    notifications: notes.status === 'fulfilled' ? notes.value.map((n) => toNote(n, owner)) : [],
    wishlist: [...new Set([...serverIds, ...localWishlist])],
    account: 'ready',
  });
  // Hearts saved while signed out move to the account.
  if (wishlist.status === 'fulfilled') {
    localWishlist.filter((id) => !serverIds.includes(id)).forEach((id) => api(`/wishlist/${id}`, { method: 'PUT' }).catch(() => {}));
  }
}

const clearAccount = () => setState({ user: null, bookings: [], notifications: [], wishlist: [], reviewsByKey: {}, account: 'ready' });

/* Called after a successful login/register. */
export async function startSession(user) {
  setState({ user, account: 'loading' });
  await loadAccount();
}

/* Pages are full reloads, so every load restores the session from the refresh cookie (only if we think we're signed in). */
export const sessionReady = (async () => {
  if (!state.user) { setState({ account: 'ready' }); return; }
  try {
    const s = await refresh();
    if (!s) { clearAccount(); return; }
    setState({ user: s.user });
    await loadAccount();
  } catch {
    setState({ account: 'ready' }); // API unreachable: keep the cached user, show empty account data
  }
})();

export const actions = {
  addToCart: (id, qty = 1) => setState((s) => {
    const hit = s.cart.find((i) => i.id === id);
    return { cart: hit ? s.cart.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i)) : [...s.cart, { id, qty }] };
  }),
  setQty: (id, qty) => setState((s) => ({ cart: qty < 1 ? s.cart.filter((i) => i.id !== id) : s.cart.map((i) => (i.id === id ? { ...i, qty } : i)) })),
  removeFromCart: (id) => setState((s) => ({ cart: s.cart.filter((i) => i.id !== id) })),
  clearCart: () => setState({ cart: [] }),
  addRecent: (q) => setState((s) => ({ recent: [q, ...s.recent.filter((x) => x !== q)].slice(0, 5) })),

  toggleWishlist: async (id) => {
    const had = state.wishlist.includes(id);
    setState((s) => ({ wishlist: had ? s.wishlist.filter((x) => x !== id) : [...s.wishlist, id] }));
    if (!state.user) return;
    try { await api(`/wishlist/${id}`, { method: had ? 'DELETE' : 'PUT' }); } catch (e) {
      setState((s) => ({ wishlist: had ? [...s.wishlist, id] : s.wishlist.filter((x) => x !== id) }));
      throw e;
    }
  },

  addBooking: async (b) => {
    const created = await api('/bookings', { method: 'POST', body: b });
    upsertBooking(created);
    loadNotifications().catch(() => {});
    return created;
  },
  cancelBooking: async (id) => {
    upsertBooking(await api(`/bookings/${id}`, { method: 'PATCH', body: { status: 'CANCELLED' } }));
    loadNotifications().catch(() => {});
  },
  rescheduleBooking: async (id, day, slot) => {
    upsertBooking(await api(`/bookings/${id}`, { method: 'PATCH', body: { day, slot } }));
  },

  loadReviews: async (kind, target) => {
    const rows = await api(`/reviews?kind=${kind}&target=${target}`);
    setState((s) => ({ reviewsByKey: { ...s.reviewsByKey, [`${kind}:${target}`]: rows.map((r) => toReview(r, kind, target)) } }));
  },
  addReview: async (r) => {
    await api('/reviews', { method: 'POST', body: r });
    if (r.bookingId) setState((s) => ({ bookings: s.bookings.map((b) => (b.id === r.bookingId ? { ...b, reviewed: true } : b)) }));
    await actions.loadReviews(r.kind, r.target);
  },

  markAllRead: (owner) => {
    setState((s) => ({ notifications: s.notifications.map((n) => (n.owner === owner ? { ...n, read: true } : n)) }));
    api('/notifications/read-all', { method: 'POST' }).catch(() => {});
  },
  sendMessage: (m) => api('/contact', { method: 'POST', body: m }),
  updateProfile: async (p) => {
    const user = await api('/auth/me', { method: 'PATCH', body: p });
    setState({ user });
  },

  signOut: async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* cookie expires on its own */ }
    setToken(null);
    clearAccount();
  },
};
