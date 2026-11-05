import { useEffect, useState } from 'react';
import { providers, rupee, services } from './data.js';
import { LiveMap } from './map.jsx';
import { Icon } from './shared.jsx';
import { DEMO_PRO_START, demoRequests, incomingRequest, useTrip } from './tracking.js';
import { EmptyState, Tag, useToast } from './ui.jsx';

/* Fixzy Pro: the professional's side. Demo state only, persisted locally; accept/decline/progress will call the API later. */
const KEY = 'fixzy:pro';
const me = providers[0];
const NEXT = { accepted: ['on_the_way', 'Start trip'], on_the_way: ['arrived', 'I’ve arrived'], arrived: ['in_progress', 'Start work'], in_progress: ['done', 'Mark complete'] };
const LABEL = { accepted: 'Accepted', on_the_way: 'On the way', arrived: 'Arrived', in_progress: 'In progress', done: 'Completed' };

const fresh = () => ({ online: true, requests: demoRequests, jobs: [], earned: 0, done: 0 });
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } };
const svcName = (id) => services.find((s) => s.id === id)?.name || 'Service';

function JobMap({ job }) {
  const moving = job.status === 'on_the_way';
  const trip = useTrip(DEMO_PRO_START, job.coords, { running: moving, seconds: 60 });
  const pos = job.status === 'accepted' ? DEMO_PRO_START : moving ? trip.pos : job.coords;
  return (
    <div className="job-map">
      <LiveMap home={job.coords} pro={pos} path={trip.path} label={`Route to ${job.address}`} />
      {moving && <p className="muted" aria-live="polite">{trip.arrived ? 'You’re at the destination.' : `${trip.distanceKm.toFixed(1)} km · about ${trip.etaMin} min to go`}</p>}
    </div>
  );
}

export function ProviderApp() {
  const toast = useToast();
  const [s, setS] = useState(load);
  const [tab, setTab] = useState('requests');
  const [open, setOpen] = useState(null);
  useEffect(() => { document.title = 'Fixzy Pro'; }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } }, [s]);

  // A new request pings in shortly after going online, as it would from the dispatch feed.
  const known = [...s.requests, ...s.jobs].some((r) => r.id === incomingRequest.id);
  useEffect(() => {
    if (!s.online || known) return undefined;
    const t = setTimeout(() => {
      setS((x) => ({ ...x, requests: [incomingRequest, ...x.requests] }));
      toast('New request nearby', { tone: 'info' });
    }, 8000);
    return () => clearTimeout(t);
  }, [s.online, known, toast]);

  const accept = (r) => {
    setS((x) => ({ ...x, requests: x.requests.filter((q) => q.id !== r.id), jobs: [{ ...r, status: 'accepted' }, ...x.jobs] }));
    setTab('jobs');
    setOpen(r.id);
    toast('Request accepted. The customer has been notified.', { tone: 'success' });
  };
  const decline = (r) => setS((x) => ({ ...x, requests: x.requests.filter((q) => q.id !== r.id) }));
  const advance = (j) => {
    const [status] = NEXT[j.status];
    setS((x) => ({
      ...x,
      jobs: x.jobs.map((q) => (q.id === j.id ? { ...q, status } : q)),
      ...(status === 'done' ? { earned: x.earned + j.estimate, done: x.done + 1 } : {}),
    }));
    if (status === 'done') toast(`Job complete · ${rupee(j.estimate)} earned`, { tone: 'success' });
  };
  const active = s.jobs.filter((j) => j.status !== 'done');
  const reset = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setS(fresh()); };
  const tabs = [['requests', `Requests${s.requests.length ? ` (${s.requests.length})` : ''}`], ['jobs', `My jobs${active.length ? ` (${active.length})` : ''}`]];

  return (
    <div className="fp">
      <header className="fp-bar">
        <a className="brand" href="/" aria-label="Fixzy home">Fixzy<b className="dot">.</b> <span className="fp-badge">Pro</span></a>
        <label className="switch">
          <input type="checkbox" role="switch" checked={s.online} onChange={(e) => setS((x) => ({ ...x, online: e.target.checked }))} />
          <span aria-hidden="true" />{s.online ? 'Online' : 'Offline'}
        </label>
      </header>
      <main className="fp-main" id="main">
        <section className="fp-hello">
          <span className="avatar" aria-hidden="true">{me.name.split(' ').map((w) => w[0]).join('')}</span>
          <div><h1>Hi, {me.name.split(' ')[0]}.</h1><p className="muted">{s.online ? 'You’re visible to customers nearby.' : 'You’re offline. Go online to receive requests.'}</p></div>
        </section>
        <dl className="fp-stats">
          <div><dt>Earnings</dt><dd>{rupee(s.earned)}</dd></div>
          <div><dt>Jobs done</dt><dd>{s.done}</dd></div>
          <div><dt>Rating</dt><dd>{me.rating} <Icon name="star" size={14} /></dd></div>
        </dl>
        <div className="fp-tabs" role="tablist">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {tab === 'requests' && (!s.online ? <EmptyState title="You’re offline" text="Go online to see new service requests." /> : s.requests.length === 0 ? <EmptyState title="No requests right now" text="We’ll alert you when someone nearby needs help." /> : (
          <ul className="fp-list">
            {s.requests.map((r) => (
              <li key={r.id} className="job">
                <div className="job-head"><div><h2>{svcName(r.serviceId)}</h2><p>{r.day} · {r.slot} · {r.distanceKm} km away</p></div><b>{rupee(r.estimate)}</b></div>
                <p className="job-addr"><Icon name="user" size={14} /> {r.customer} · {r.address}</p>
                {r.notes && <p className="muted">“{r.notes}”</p>}
                <div className="job-actions">
                  <button type="button" className="pill pill-small" onClick={() => accept(r)}>Accept</button>
                  <button type="button" className="pill pill-small pill-outline" onClick={() => decline(r)}>Decline</button>
                </div>
              </li>
            ))}
          </ul>
        ))}

        {tab === 'jobs' && (s.jobs.length === 0 ? <EmptyState title="No jobs yet" text="Accepted requests appear here." /> : (
          <ul className="fp-list">
            {s.jobs.map((j) => (
              <li key={j.id} className="job">
                <div className="job-head"><div><h2>{svcName(j.serviceId)}</h2><p>{j.customer} · {j.day} {j.slot}</p></div><Tag tone={j.status === 'done' ? 'success' : 'neutral'}>{LABEL[j.status]}</Tag></div>
                <p className="job-addr">{j.address}</p>
                {j.status !== 'done' && open === j.id && <JobMap job={j} />}
                {j.status !== 'done' && (
                  <div className="job-actions">
                    <button type="button" className="pill pill-small" onClick={() => advance(j)}>{NEXT[j.status][1]}</button>
                    <button type="button" className="text-link" onClick={() => setOpen(open === j.id ? null : j.id)}>{open === j.id ? 'Hide map' : 'Show route'}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}
        <p className="muted fp-foot">Demo data. Requests will come from customers’ bookings once the provider API is connected. <button type="button" className="text-link" onClick={reset}>Reset demo</button></p>
      </main>
    </div>
  );
}
