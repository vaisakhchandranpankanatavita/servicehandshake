import { useState } from 'react';
import { isoDay, products, rupee, services, slots } from './data.js';
import { loginUrl } from './auth.js';
import { Page } from './pages.jsx';
import { Icon, Reveal } from './shared.jsx';
import { actions, useStore } from './store.js';
import { EmptyState, Tag, useToast } from './ui.jsx';
import { ReviewForm } from './social.jsx';

const FLOW = ['requested', 'confirmed', 'on_the_way', 'in_progress', 'done'];
const LABEL = { requested: 'Requested', confirmed: 'Confirmed', on_the_way: 'On the way', in_progress: 'In progress', done: 'Done', cancelled: 'Cancelled' };
const TONE = { done: 'success', cancelled: 'error', requested: 'warn' };

function SignInGate({ current, label, lines, lead, icon, points }) {
  return (
    <Page current={current} label={label} lines={lines} lead={lead}>
      <Reveal className="gate">
        <span className="gate-icon"><Icon name={icon} size={26} /></span>
        <div>
          <h2 className="h2">Sign in to continue</h2>
          <ul className="gate-points">{points.map((t) => <li key={t}><Icon name="check" size={16} />{t}</li>)}</ul>
        </div>
        <div className="gate-actions">
          <a className="pill" href={loginUrl(current)}>Sign in <Icon name="arrow-right" size={16} /></a>
          <a className="pill pill-outline" href={`/register?redirect=${current}`}>Create account</a>
        </div>
      </Reveal>
    </Page>
  );
}

const fmtDay = (iso) => new Date(`${iso}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const dayOptions = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return isoDay(d); });

function Timeline({ status }) {
  const at = FLOW.indexOf(status);
  return (
    <ol className="timeline" aria-label="Booking progress" style={{ '--fill': Math.max(at, 0) / (FLOW.length - 1) }}>
      {FLOW.map((s, i) => <li key={s} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} aria-current={i === at ? 'step' : undefined}><span>{LABEL[s]}</span></li>)}
    </ol>
  );
}

function BookingCard({ b }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const reviewed = b.reviewed;
  const [day, setDay] = useState(b.day);
  const [slot, setSlot] = useState(b.slot);
  const svc = services.find((s) => s.id === b.serviceId);
  const live = b.status !== 'cancelled' && b.status !== 'done';
  const run = async (fn, okText) => {
    setBusy(true);
    try { await fn(); if (okText) toast(okText, { tone: 'success' }); return true; } catch (e) { toast(e.message, { tone: 'error' }); return false; } finally { setBusy(false); }
  };
  const cancel = () => {
    if (!window.confirm('Cancel this booking? This can’t be undone.')) return;
    run(() => actions.cancelBooking(b.id), 'Booking cancelled');
  };
  const save = async () => {
    if (await run(() => actions.rescheduleBooking(b.id, day, slot), 'Booking rescheduled')) setEditing(false);
  };
  return (
    <li className="booking">
      <div className="booking-head">
        <div><h2>{svc?.name || 'Service'}</h2><p>{fmtDay(b.day)} at {b.slot} · {b.address}</p></div>
        <Tag tone={TONE[b.status]}>{LABEL[b.status]}</Tag>
      </div>
      {b.status !== 'cancelled' && <Timeline status={b.status} />}
      {editing && (
        <div className="reschedule">
          <label>Day <select value={day} onChange={(e) => setDay(e.target.value)}>{dayOptions().map((d) => <option key={d} value={d}>{fmtDay(d)}</option>)}</select></label>
          <label>Time <select value={slot} onChange={(e) => setSlot(e.target.value)}>{slots.map((t) => <option key={t}>{t}</option>)}</select></label>
          <button type="button" className="pill pill-small" disabled={busy} onClick={save}>Save</button>
          <button type="button" className="text-link" onClick={() => setEditing(false)}>Keep as is</button>
        </div>
      )}
      {reviewing && <ReviewForm kind="service" target={b.serviceId} bookingId={b.id} label={`How was your ${svc?.name || 'service'}?`} onDone={() => setReviewing(false)} />}
      <div className="booking-actions">
        <span className="booking-id">#{b.id}</span>
        {['confirmed', 'on_the_way', 'in_progress'].includes(b.status) && <a className="text-link" href={`/track?id=${b.id}`}>Track</a>}
        {live && !editing && <button type="button" className="text-link" onClick={() => setEditing(true)}>Reschedule</button>}
        {live && <button type="button" className="text-link" disabled={busy} onClick={cancel}>Cancel</button>}
        {b.status === 'done' && !reviewed && <button type="button" className="text-link" onClick={() => setReviewing((v) => !v)}>Leave a review</button>}
        {!live && <a className="text-link" href={`/service-request?service_id=${b.serviceId}`}>Book again</a>}
      </div>
    </li>
  );
}

export function Orders() {
  const user = useStore((s) => s.user);
  const bookings = useStore((s) => s.bookings);
  const loading = useStore((s) => s.account === 'loading');
  if (!user) {
    return <SignInGate current="orders" icon="calendar" label="Bookings" lines={['Your', 'bookings.']} lead="Track every service request in one place."
      points={['See upcoming and past visits', 'Follow each request’s status', 'Rebook a service in one tap']} />;
  }
  const mine = bookings.filter((b) => b.owner === user.email);
  return (
    <Page current="orders" label="Bookings" lines={['Your', 'bookings.']} lead="Track every service request in one place.">
      {loading && mine.length === 0 ? (
        <p role="status" className="muted">Loading your bookings…</p>
      ) : mine.length === 0 ? (
        <EmptyState title="No bookings yet" text="Book a service and it will show up here." action={<a className="pill" href="/services">Browse services</a>} />
      ) : (
        <ul className="bookings">{mine.map((b) => <BookingCard key={b.id} b={b} />)}</ul>
      )}
    </Page>
  );
}

export function Dashboard() {
  const user = useStore((s) => s.user);
  const bookings = useStore((s) => s.bookings);
  const wishlist = useStore((s) => s.wishlist);
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  if (!user) {
    return <SignInGate current="dashboard" icon="user" label="Dashboard" lines={['Your', 'dashboard.']} lead="Your account, bookings and orders at a glance."
      points={['Manage your profile and address', 'Review bookings and marketplace orders', 'Pick up where you left off']} />;
  }
  const mine = bookings.filter((b) => b.owner === user.email);
  const upcoming = mine.filter((b) => b.status !== 'done' && b.status !== 'cancelled');
  const saved = products.filter((p) => wishlist.includes(p.id));
  const code = 'FX' + [...user.email].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 1679616, 7).toString(36).toUpperCase().padStart(4, '0');
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); toast('Referral code copied', { tone: 'success' }); } catch { toast(`Your code: ${code}`); }
  };
  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await actions.updateProfile({ name: name.trim(), phone: phone.trim() });
      toast('Profile saved', { tone: 'success' });
    } catch (err) {
      toast(err.message, { tone: 'error' });
    }
  };
  return (
    <Page current="dashboard" label="Dashboard" lines={[`Hi, ${user.name.split(' ')[0]}.`]} lead="Your account, bookings and orders at a glance.">
      <aside className="promo" aria-label="Offers">
        <div><b>10% off your next marketplace order</b><span>Use code FIXZY10 at checkout.</span></div>
        <div><b>Refer a friend</b><span>Share your code <code>{code}</code> <button type="button" className="text-link" onClick={copy}>Copy</button></span></div>
      </aside>
      <div className="dash">
        <section className="dash-card">
          <h2>Upcoming</h2>
          {upcoming.length === 0 ? <p>Nothing scheduled. <a className="text-link" href="/services">Book a service</a></p> : (
            <ul>{upcoming.slice(0, 3).map((b) => <li key={b.id}>{services.find((s) => s.id === b.serviceId)?.name} · {fmtDay(b.day)} {b.slot} <Tag tone={TONE[b.status]}>{LABEL[b.status]}</Tag></li>)}</ul>
          )}
          <a className="text-link" href="/orders">All bookings</a>
        </section>
        <section className="dash-card">
          <h2>Profile</h2>
          <form className="form" onSubmit={saveProfile}>
            <div className="field"><label htmlFor="p-name">Full name</label><input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="field"><label htmlFor="p-phone">Phone</label><input id="p-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
            <p className="muted">{user.email}</p>
            <button className="pill pill-small" type="submit">Save changes</button>
          </form>
        </section>
        <section className="dash-card">
          <h2>Saved items</h2>
          {saved.length === 0 ? <p>Nothing saved yet.</p> : <ul>{saved.map((p) => <li key={p.id}><a className="text-link" href={`/product?id=${p.id}`}>{p.name}</a> · {rupee(p.price)}</li>)}</ul>}
        </section>
      </div>
      <p><button type="button" className="pill pill-outline" onClick={async () => { await actions.signOut(); window.location.assign('/'); }}>Sign out</button></p>
    </Page>
  );
}
