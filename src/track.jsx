import { providers, services } from './data.js';
import { loginUrl } from './auth.js';
import { LiveMap } from './map.jsx';
import { Page } from './pages.jsx';
import { Icon } from './shared.jsx';
import { useStore } from './store.js';
import { DEMO_HOME, DEMO_PRO_START, useTrip } from './tracking.js';
import { EmptyState, Tag } from './ui.jsx';

const STEPS = [
  ['requested', 'Request sent', 'Waiting for a professional to accept.'],
  ['confirmed', 'Accepted', 'Your professional is getting ready to leave.'],
  ['on_the_way', 'On the way', 'Follow them live on the map.'],
  ['in_progress', 'Work started', 'The job is under way.'],
  ['done', 'Completed', 'All done. Leave a review from your bookings.'],
];

const demoBooking = { id: 'DEMO', status: 'on_the_way', serviceId: 1, providerId: 1, address: 'Marine Drive, Ernakulam' };
const initials = (name) => name.split(' ').map((w) => w[0]).join('');

function Trip({ booking }) {
  const svc = services.find((s) => s.id === booking.serviceId);
  const pro = providers.find((p) => p.id === booking.providerId) || providers.find((p) => p.serviceIds.includes(booking.serviceId));
  const moving = booking.status === 'on_the_way';
  const waiting = booking.status === 'requested';
  const onSite = booking.status === 'in_progress' || booking.status === 'done';
  const trip = useTrip(DEMO_PRO_START, DEMO_HOME, { running: moving });
  const proPos = waiting ? null : onSite ? DEMO_HOME : trip.pos;
  const at = STEPS.findIndex(([s]) => s === booking.status);
  const [, headline, sub] = STEPS[Math.max(at, 0)];
  const eta = moving ? (trip.arrived ? 'Arrived' : `${trip.etaMin} min`) : waiting ? '—' : onSite ? 'Here' : 'Soon';
  const detail = moving ? (trip.arrived ? 'Your professional has arrived.' : `${trip.distanceKm.toFixed(1)} km away. ${sub}`) : sub;

  return (
    <div className="track">
      <div className="track-map">
        <LiveMap home={DEMO_HOME} pro={proPos} path={waiting ? null : trip.path} label={waiting ? 'Map showing your address' : 'Live map showing your professional on the way to your address'} />
        <span className="track-live"><i aria-hidden="true" />{moving ? 'Live' : waiting ? 'Waiting' : 'Updated'}</span>
      </div>
      <aside className="track-side">
        <div className="track-eta" aria-live="polite">
          <Tag tone={booking.status === 'done' ? 'success' : waiting ? 'warn' : 'neutral'}>{headline}</Tag>
          <b>{eta}</b>
          <p>{detail}</p>
        </div>
        {pro && !waiting && (
          <div className="fp-card">
            <span className="avatar" aria-hidden="true">{initials(pro.name)}</span>
            <div>
              <h2>{pro.name}</h2>
              <p>{svc?.name} · <Icon name="star" size={13} /> {pro.rating} · {pro.jobs} jobs</p>
            </div>
            {pro.verified && <Tag tone="success">Verified</Tag>}
          </div>
        )}
        <ol className="track-steps">
          {STEPS.map(([s, title], i) => <li key={s} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} aria-current={i === at ? 'step' : undefined}>{title}</li>)}
        </ol>
        <p className="muted">To {booking.address}. Positions are simulated until live GPS is connected.</p>
        <a className="text-link" href="/orders">Back to bookings</a>
      </aside>
    </div>
  );
}

const hero = { current: 'orders', label: 'Tracking', lines: ['Track your', 'service.'], lead: 'See where your professional is, in real time.' };

export function Track() {
  const user = useStore((s) => s.user);
  const bookings = useStore((s) => s.bookings);
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') return <Page {...hero}><Trip booking={demoBooking} /></Page>;
  if (!user) {
    return (
      <Page {...hero}>
        <EmptyState title="Sign in to track" text="Sign in to follow your professional on the map." action={<a className="pill" href={loginUrl('track')}>Sign in</a>} />
      </Page>
    );
  }
  const mine = bookings.filter((b) => b.owner === user.email);
  const booking = mine.find((b) => b.id === params.get('id')) || mine.find((b) => !['cancelled', 'done'].includes(b.status));
  return (
    <Page {...hero}>
      {booking ? <Trip booking={booking} /> : <EmptyState title="Nothing to track" text="Active bookings show up here once you book." action={<a className="pill" href="/services">Browse services</a>} />}
    </Page>
  );
}
