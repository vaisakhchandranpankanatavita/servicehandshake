import { useState } from 'react';
import { api } from './api.js';
import { Badge, FormModal, Page, Table, act, money, useList, when } from './ui.jsx';

const FLOW = ['REQUESTED', 'CONFIRMED', 'ON_THE_WAY', 'IN_PROGRESS', 'DONE'];
const ORDER_FLOW = ['PLACED', 'SHIPPED', 'DELIVERED'];
const label = (s) => s.replace(/_/g, ' ').toLowerCase();

function Filters({ q, setQ, status, setStatus, options }) {
  return <div className="filters">
    <input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
    {options && <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter">
      <option value="">All</option>{options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
    </select>}
  </div>;
}

/* ---------- Dashboard ---------- */
export function Dashboard() {
  const { rows: s, error } = useList('/admin/stats');
  if (error) return <Page title="Dashboard"><div className="card err">{error}</div></Page>;
  if (!s) return <Page title="Dashboard"><div className="empty">Loading…</div></Page>;
  const max = Math.max(1, ...s.series.map((d) => d.bookings));
  const rmax = Math.max(1, ...s.series.map((d) => d.revenue));
  const kpis = [['Open bookings', s.openBookings], ['Today’s jobs', s.todayBookings], ['Total bookings', s.bookings], ['Orders', s.orders], ['Shop revenue', money(s.productRevenue)], ['Users', s.users], ['Messages', s.messages]];
  return <Page title="Dashboard">
    <div className="kpis">{kpis.map(([l, n]) => <div className="card kpi" key={l}><div className="l">{l}</div><div className="n">{n}</div></div>)}</div>
    <div className="grid2">
      <div className="card"><h2>Bookings, last 30 days</h2>
        <div className="bars">{s.series.map((d) => <div key={d.day} style={{ height: `${(d.bookings / max) * 100}%` }} title={`${d.day}: ${d.bookings}`} />)}</div>
        <div className="axis"><span>{s.series[0].day.slice(5)}</span><span>{s.series.at(-1).day.slice(5)}</span></div></div>
      <div className="card"><h2>Shop revenue, last 30 days</h2>
        <div className="bars">{s.series.map((d) => <div key={d.day} style={{ height: `${(d.revenue / rmax) * 100}%` }} title={`${d.day}: ${money(d.revenue)}`} />)}</div>
        <div className="axis"><span>{s.series[0].day.slice(5)}</span><span>{s.series.at(-1).day.slice(5)}</span></div></div>
      <div className="card"><h2>Bookings by status</h2>
        {Object.entries(s.bookingsByStatus).map(([k, n]) => <div className="statusrow" key={k}><Badge v={k} /><b>{n}</b></div>)}
        {!Object.keys(s.bookingsByStatus).length && <div className="empty">No bookings yet.</div>}</div>
    </div>
  </Page>;
}

/* ---------- Bookings ---------- */
export function Bookings() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { rows, error, reload } = useList('/admin/bookings', { q, status });
  const pros = useList('/admin/providers').rows ?? [];
  const next = (s) => (s === 'DONE' || s === 'CANCELLED' ? [] : [FLOW[FLOW.indexOf(s) + 1], 'CANCELLED']);
  return <Page title="Bookings" actions={<Filters {...{ q, setQ, status, setStatus }} options={[...FLOW, 'CANCELLED']} />}>
    <Table error={error} rows={rows} empty="No bookings match." cols={[
      { h: 'ID', render: (b) => <b>#{b.id}</b> },
      { h: 'Service', render: (b) => b.service.name },
      { h: 'When', render: (b) => `${b.day} ${b.slot}` },
      { h: 'Customer', wrap: true, render: (b) => <>{b.name}<br /><small>{b.phone}</small></> },
      { h: 'Address', wrap: true, render: (b) => b.address },
      { h: 'Pro', render: (b) => <select value={b.providerId ?? ''} aria-label="Assign pro"
          onChange={(e) => act(() => api(`/admin/bookings/${b.id}/provider`, { method: 'PATCH', body: { providerId: e.target.value ? Number(e.target.value) : null } }), 'Pro updated', reload)}>
          <option value="">Unassigned</option>
          {pros.filter((p) => p.services.some((s) => s.id === b.serviceId)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select> },
      { h: 'Est.', render: (b) => money(b.estimate) },
      { h: 'Status', render: (b) => <Badge v={b.status} /> },
      { h: '', render: (b) => <div className="row-actions">{next(b.status).map((s) =>
          <button key={s} className={`btn sm ${s === 'CANCELLED' ? 'danger' : ''}`}
            onClick={() => (s !== 'CANCELLED' || confirm(`Cancel booking #${b.id}?`)) && act(() => api(`/bookings/${b.id}/status`, { method: 'PATCH', body: { status: s } }), `#${b.id} → ${label(s)}`, reload)}>
            {s === 'CANCELLED' ? 'Cancel' : `Mark ${label(s)}`}</button>)}</div> },
    ]} />
  </Page>;
}

/* ---------- Orders ---------- */
export function Orders() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { rows, error, reload } = useList('/admin/orders', { q, status });
  const set = (o, s) => act(() => api(`/admin/orders/${o.id}/status`, { method: 'PATCH', body: { status: s } }), `#${o.id} → ${label(s)}`, reload);
  return <Page title="Orders" actions={<Filters {...{ q, setQ, status, setStatus }} options={[...ORDER_FLOW, 'CANCELLED']} />}>
    <Table error={error} rows={rows} empty="No orders match." cols={[
      { h: 'ID', render: (o) => <b>#{o.id}</b> },
      { h: 'Placed', render: (o) => when(o.createdAt) },
      { h: 'Customer', wrap: true, render: (o) => <>{o.name}<br /><small>{o.phone}</small></> },
      { h: 'Ship to', wrap: true, render: (o) => `${o.address}, ${o.city} ${o.pin}` },
      { h: 'Items', wrap: true, render: (o) => o.items.map((i) => `${i.qty}× ${i.product.name}`).join(', ') },
      { h: 'Total', render: (o) => <>{money(o.total)}{o.coupon && <> <small>({o.coupon})</small></>}</> },
      { h: 'Status', render: (o) => <Badge v={o.status} /> },
      { h: '', render: (o) => {
        if (o.status === 'DELIVERED' || o.status === 'CANCELLED') return null;
        const n = ORDER_FLOW[ORDER_FLOW.indexOf(o.status) + 1];
        return <div className="row-actions">
          <button className="btn sm" onClick={() => set(o, n)}>Mark {label(n)}</button>
          <button className="btn sm danger" onClick={() => confirm(`Cancel order #${o.id}?`) && set(o, 'CANCELLED')}>Cancel</button>
        </div>;
      } },
    ]} />
  </Page>;
}

/* ---------- Users ---------- */
export function Users({ me }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const { rows, error, reload } = useList('/admin/users', { q, role });
  return <Page title="Users" actions={<Filters {...{ q, setQ, status: role, setStatus: setRole }} options={['CUSTOMER', 'PROVIDER', 'ADMIN']} />}>
    <Table error={error} rows={rows} empty="No users match." cols={[
      { h: 'Name', render: (u) => <b>{u.name}</b> },
      { h: 'Email', render: (u) => u.email },
      { h: 'Phone', render: (u) => u.phone },
      { h: 'Bookings', render: (u) => u._count.bookings },
      { h: 'Orders', render: (u) => u._count.orders },
      { h: 'Joined', render: (u) => when(u.createdAt) },
      { h: 'Role', render: (u) => u.id === me.id ? <Badge v={u.role} /> :
          <select value={u.role} aria-label={`Role for ${u.name}`}
            onChange={(e) => confirm(`Make ${u.name} a ${e.target.value.toLowerCase()}?`) && act(() => api(`/admin/users/${u.id}/role`, { method: 'PATCH', body: { role: e.target.value } }), 'Role updated', reload)}>
            {['CUSTOMER', 'PROVIDER', 'ADMIN'].map((r) => <option key={r} value={r}>{label(r)}</option>)}
          </select> },
    ]} />
  </Page>;
}

/* ---------- Generic catalog CRUD ---------- */
function Crud({ title, path, listPath = path, noun, fields, cols, idKey = 'id', createExtra }) {
  const { rows, error, reload } = useList(listPath);
  const [form, setForm] = useState(null); // { row? }
  const key = (r) => r[idKey];
  return <Page title={title} actions={<button className="btn primary" onClick={() => setForm({})}>Add {noun}</button>}>
    <Table error={error} rows={rows} cols={[...cols, { h: '', render: (r) => <div className="row-actions">
      <button className="btn sm" onClick={() => setForm({ row: r })}>Edit</button>
      <button className="btn sm danger" onClick={() => confirm(`Delete this ${noun}?`) && act(() => api(`${path}/${key(r)}`, { method: 'DELETE' }), `${noun} deleted`, reload)}>Delete</button>
    </div> }]} />
    {form && <FormModal title={form.row ? `Edit ${noun}` : `New ${noun}`} fields={fields} initial={form.row ? { ...form.row, ...(form.row.services ? { serviceIds: form.row.services.map((s) => s.id) } : {}) } : createExtra}
      onClose={() => setForm(null)}
      onSubmit={async (v) => { await api(form.row ? `${path}/${key(form.row)}` : path, { method: form.row ? 'PATCH' : 'POST', body: v }); await reload(); }} />}
  </Page>;
}

export function Services() {
  return <Crud title="Services" path="/admin/services" listPath="/services" noun="service"
    fields={[
      { key: 'name', label: 'Name', type: 'text' }, { key: 'category', label: 'Category', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'fromPrice', label: 'From price (₹)', type: 'number' }, { key: 'duration', label: 'Duration (minutes)', type: 'number' },
      { key: 'terms', label: 'Search terms', type: 'text', required: false },
    ]}
    cols={[
      { h: 'ID', render: (s) => s.id }, { h: 'Name', render: (s) => <b>{s.name}</b> }, { h: 'Category', render: (s) => s.category },
      { h: 'From', render: (s) => money(s.fromPrice) }, { h: 'Duration', render: (s) => `${s.duration} min` },
      { h: 'Rating', render: (s) => (s.rating ? `${s.rating.toFixed(1)} (${s.reviews})` : '—') },
    ]} />;
}

export function Providers() {
  const services = useList('/services').rows ?? [];
  return <Crud title="Pros" path="/admin/providers" noun="pro"
    createExtra={{ verified: true, years: 1, response: '30 min' }}
    fields={[
      { key: 'name', label: 'Name', type: 'text' }, { key: 'years', label: 'Years of experience', type: 'number' },
      { key: 'response', label: 'Typical response (e.g. 30 min)', type: 'text' },
      { key: 'verified', label: 'Verified', type: 'bool' },
      { key: 'serviceIds', label: 'Services offered (ctrl/cmd-click for several)', type: 'multi', options: services },
    ]}
    cols={[
      { h: 'ID', render: (p) => p.id }, { h: 'Name', render: (p) => <b>{p.name}</b> }, { h: 'Experience', render: (p) => `${p.years} yrs` },
      { h: 'Response', render: (p) => p.response }, { h: 'Verified', render: (p) => <Badge v={p.verified ? 'DONE' : 'REQUESTED'} /> },
      { h: 'Services', wrap: true, render: (p) => p.services.map((s) => s.name).join(', ') }, { h: 'Jobs', render: (p) => p._count.bookings },
    ]} />;
}

export function Products() {
  return <Crud title="Products" path="/admin/products" listPath="/products" noun="product"
    fields={[
      { key: 'name', label: 'Name', type: 'text' }, { key: 'seller', label: 'Seller', type: 'text' }, { key: 'category', label: 'Category', type: 'text' },
      { key: 'price', label: 'Price (₹)', type: 'number' }, { key: 'oldPrice', label: 'Old price (₹)', type: 'number' },
      { key: 'img', label: 'Image path or URL', type: 'text' }, { key: 'blurb', label: 'Short blurb', type: 'textarea', required: false },
    ]}
    cols={[
      { h: '', render: (p) => <img src={p.img} alt="" width="36" height="36" style={{ objectFit: 'cover', borderRadius: 6 }} onError={(e) => (e.currentTarget.style.visibility = 'hidden')} /> },
      { h: 'Name', render: (p) => <b>{p.name}</b> }, { h: 'Seller', render: (p) => p.seller }, { h: 'Category', render: (p) => p.category },
      { h: 'Price', render: (p) => <>{money(p.price)} <small><s>{money(p.oldPrice)}</s></small></> },
    ]} />;
}

export function Coupons() {
  const { rows, error, reload } = useList('/admin/coupons');
  const [form, setForm] = useState(null);
  return <Page title="Coupons" actions={<button className="btn primary" onClick={() => setForm({})}>Add coupon</button>}>
    <Table error={error} rows={rows} cols={[
      { h: 'Code', render: (c) => <b>{c.code}</b> }, { h: 'Discount', render: (c) => `${c.percent}%` },
      { h: 'Status', render: (c) => <Badge v={c.active ? 'DONE' : 'CANCELLED'} /> },
      { h: '', render: (c) => <div className="row-actions">
        <button className="btn sm" onClick={() => act(() => api(`/admin/coupons/${c.code}`, { method: 'PATCH', body: { active: !c.active } }), c.active ? 'Coupon disabled' : 'Coupon enabled', reload)}>{c.active ? 'Disable' : 'Enable'}</button>
        <button className="btn sm" onClick={() => setForm({ row: c })}>Edit</button>
        <button className="btn sm danger" onClick={() => confirm(`Delete ${c.code}?`) && act(() => api(`/admin/coupons/${c.code}`, { method: 'DELETE' }), 'Coupon deleted', reload)}>Delete</button>
      </div> },
    ]} />
    {form && <FormModal title={form.row ? 'Edit coupon' : 'New coupon'} initial={form.row ?? { active: true }} onClose={() => setForm(null)}
      fields={[{ key: 'code', label: 'Code (A–Z, 0–9, - _)', type: 'text', locked: true }, { key: 'percent', label: 'Percent off (1–100)', type: 'number' }, { key: 'active', label: 'Active', type: 'bool' }]}
      onSubmit={async (v) => {
        if (form.row) await api(`/admin/coupons/${form.row.code}`, { method: 'PATCH', body: { percent: v.percent, active: v.active } });
        else await api('/admin/coupons', { method: 'POST', body: { ...v, code: v.code.trim().toUpperCase() } });
        await reload();
      }} />}
  </Page>;
}

/* ---------- Reviews & messages ---------- */
export function Inbox() {
  const msgs = useList('/admin/messages');
  const reviews = useList('/admin/reviews');
  return <Page title="Inbox">
    <h2>Contact messages</h2>
    <Table error={msgs.error} rows={msgs.rows} empty="No messages." cols={[
      { h: 'Received', render: (m) => when(m.createdAt) }, { h: 'From', render: (m) => <>{m.name}<br /><small>{m.email}</small></> },
      { h: 'Message', wrap: true, render: (m) => m.message },
      { h: '', render: (m) => <div className="row-actions">
        <a className="btn sm" href={`mailto:${m.email}`}>Reply</a>
        <button className="btn sm danger" onClick={() => confirm('Delete this message?') && act(() => api(`/admin/messages/${m.id}`, { method: 'DELETE' }), 'Deleted', msgs.reload)}>Delete</button>
      </div> },
    ]} />
    <div style={{ height: 24 }} />
    <h2>Reviews</h2>
    <Table error={reviews.error} rows={reviews.rows} empty="No reviews." cols={[
      { h: 'Date', render: (r) => when(r.createdAt) }, { h: 'By', render: (r) => r.user.name },
      { h: 'For', render: (r) => `${r.kind} #${r.target}` }, { h: 'Rating', render: (r) => '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) },
      { h: 'Text', wrap: true, render: (r) => r.text || '—' },
      { h: '', render: (r) => <button className="btn sm danger" onClick={() => confirm('Delete this review?') && act(() => api(`/admin/reviews/${r.id}`, { method: 'DELETE' }), 'Review removed', reviews.reload)}>Delete</button> },
    ]} />
  </Page>;
}
