const BASE = process.env.API ?? 'http://localhost:4000/api';
let failed = 0;

async function call(method: string, path: string, opts: { token?: string; body?: unknown; cookie?: string } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* empty body */ }
  return { status: res.status, json, cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ->  ' + JSON.stringify(detail)}`);
}

const run = Date.now().toString(36);
const email = `smoke_${run}@example.com`;
const day = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
const booking = { serviceId: 1, providerId: 1, day, slot: '11:00', name: 'Smoke Test', phone: '9876543210', address: '12 Test Street' };

async function main() {
  let r = await call('GET', '/services');
  check('catalog: lists 8 services', r.status === 200 && r.json.length === 8, r.status);

  r = await call('POST', '/auth/register', { body: { name: 'Smoke Test', email, phone: '9876543210', password: 'short' } });
  check('auth: rejects weak password', r.status === 400, r.status);

  r = await call('POST', '/auth/register', { body: { name: 'Smoke Test', email, phone: '9876543210', password: 'Passw0rd!x' } });
  check('auth: register', r.status === 201 && !!r.json.accessToken && !r.json.refreshToken && !!r.cookie, r);
  const token = r.json.accessToken as string;
  const refreshCookie = r.cookie!;

  r = await call('POST', '/auth/register', { body: { name: 'Dup', email: email.toUpperCase(), phone: '9876543210', password: 'Passw0rd!x' } });
  check('auth: duplicate email (case-insensitive) rejected', r.status === 409, r.status);

  r = await call('POST', '/auth/login', { body: { email, password: 'wrong-password' } });
  check('auth: bad password -> 401', r.status === 401, r.status);

  r = await call('GET', '/auth/me', { token });
  check('auth: /me returns user', r.status === 200 && r.json.email === email, r);

  r = await call('GET', '/auth/me');
  check('auth: /me without token -> 401', r.status === 401, r.status);

  r = await call('PATCH', '/auth/me', { token, body: { name: 'Smoke Renamed', phone: '9123456780' } });
  check('auth: update profile', r.status === 200 && r.json.name === 'Smoke Renamed' && r.json.phone === '9123456780' && r.json.email === email, r);
  r = await call('PATCH', '/auth/me', { token, body: { name: 'X', phone: 'abc', role: 'ADMIN' } });
  check('auth: profile update rejects bad input and role escalation', r.status === 400, r.status);

  r = await call('POST', '/auth/refresh', { cookie: refreshCookie });
  check('auth: refresh rotates token', r.status === 200 && !!r.json.accessToken && !!r.cookie && r.cookie !== refreshCookie, r);
  const reused = await call('POST', '/auth/refresh', { cookie: refreshCookie });
  check('auth: old refresh token cannot be reused', reused.status === 401, reused.status);

  r = await call('POST', '/bookings', { body: booking });
  check('booking: requires auth', r.status === 401, r.status);

  r = await call('POST', '/bookings', { token, body: { ...booking, day: new Date().toISOString().slice(0, 10) } });
  check('booking: rejects same-day/past date', r.status === 400, r.status);

  r = await call('POST', '/bookings', { token, body: { ...booking, providerId: 2 } });
  check('booking: rejects pro who does not offer service', r.status === 400, r.status);

  r = await call('POST', '/bookings', { token, body: booking });
  check('booking: create', r.status === 201 && r.json.status === 'REQUESTED' && /^FX/.test(r.json.id), r);
  const bookingId = r.json?.id as string;

  r = await call('POST', '/bookings', { token, body: booking });
  check('booking: same pro+slot double-booking -> 409', r.status === 409, r.status);

  r = await call('GET', `/services/1/availability?day=${day}&providerId=1`);
  const slot11 = r.json?.slots?.find((s: any) => s.slot === '11:00');
  check('availability: taken slot reported unavailable', slot11?.available === false, r.json);

  r = await call('PATCH', `/bookings/${bookingId}`, { token, body: { slot: '13:00' } });
  check('booking: reschedule', r.status === 200 && r.json.slot === '13:00', r);

  r = await call('PATCH', `/bookings/${bookingId}/status`, { token, body: { status: 'CONFIRMED' } });
  check('booking: customer cannot change status (role guard) -> 403', r.status === 403, r.status);

  r = await call('POST', '/reviews', { token, body: { kind: 'service', target: 1, bookingId, rating: 5, text: 'Great' } });
  check('review: blocked until booking is DONE', r.status === 400, r.status);

  r = await call('PATCH', `/bookings/${bookingId}`, { token, body: { status: 'CANCELLED' } });
  check('booking: cancel', r.status === 200 && r.json.status === 'CANCELLED', r);

  r = await call('POST', '/bookings', { token, body: { ...booking, slot: '13:00' } });
  check('booking: cancelled slot can be rebooked', r.status === 201, r);

  r = await call('GET', '/bookings', { token });
  check('booking: list returns own bookings', r.status === 200 && r.json.length === 2, r.json?.length);

  const other = await call('POST', '/auth/register', { body: { name: 'Other User', email: `other_${run}@example.com`, phone: '9876543211', password: 'Passw0rd!x' } });
  r = await call('GET', `/bookings/${bookingId}`, { token: other.json.accessToken });
  check("booking: other user can't read it -> 404", r.status === 404, r.status);
  r = await call('PATCH', `/bookings/${bookingId}`, { token: other.json.accessToken, body: { status: 'CANCELLED' } });
  check("booking: other user can't modify it -> 404", r.status === 404, r.status);

  r = await call('GET', '/notifications', { token });
  check('notifications: created by booking events', r.status === 200 && r.json.length >= 2, r.json?.length);

  r = await call('POST', '/orders', { token, body: { name: 'Smoke', phone: '9876543210', address: '1 Road', city: 'Kochi', pin: '682001', items: [{ productId: 1, qty: 2 }, { productId: 3, qty: 1 }], coupon: 'fixzy10' } });
  const expectedSubtotal = 350 * 2 + 1649;
  check('order: server-priced total with coupon', r.status === 201 && r.json.subtotal === expectedSubtotal && r.json.discount === Math.round(expectedSubtotal * 0.1) && r.json.total === expectedSubtotal - r.json.discount, r.json);

  r = await call('POST', '/orders', { token, body: { name: 'Smoke', phone: '9876543210', address: '1 Road', city: 'Kochi', pin: '682001', items: [{ productId: 1, qty: 1 }], coupon: 'BOGUS' } });
  check('order: invalid coupon rejected', r.status === 400, r.status);

  r = await call('POST', '/orders', { token, body: { name: 'Smoke', phone: '9876543210', address: '1 Road', city: 'Kochi', pin: '682001', items: [{ productId: 999, qty: 1 }] } });
  check('order: unknown product rejected', r.status === 400, r.status);

  r = await call('POST', '/orders', { token, body: { name: 'Smoke', phone: '9876543210', address: '1 Road', city: 'Kochi', pin: '682001', items: [{ productId: 1, qty: 1, price: 1 }] } });
  check('order: client-supplied price field rejected', r.status === 400, r.status);

  r = await call('POST', '/reviews', { token, body: { kind: 'product', target: 1, rating: 4, text: 'Bright' } });
  check('review: product review allowed after ordering it', r.status === 201, r);
  r = await call('POST', '/reviews', { token, body: { kind: 'product', target: 5, rating: 4 } });
  check("review: can't review a product never ordered", r.status === 400, r.status);

  r = await call('PUT', '/wishlist/3', { token });
  check('wishlist: add', r.status === 204, r.status);
  r = await call('GET', '/wishlist', { token });
  check('wishlist: list', r.status === 200 && r.json.length === 1 && r.json[0].id === 3, r.json);

  r = await call('POST', '/contact', { body: { name: 'Visitor', email: 'v@example.com', message: 'Hello, this is a message.' } });
  check('contact: public submit', r.status === 201, r.status);

  r = await call('POST', '/auth/logout', { cookie: refreshCookie });
  check('auth: logout', r.status === 204, r.status);

  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
