import { useEffect, useMemo, useState } from 'react';
import { categories, discount, products, providers, rupee, serviceCategories, services } from './data.js';
import { Avatar, HeartButton, Reviews, Stars } from './social.jsx';
import { ActiveFilters, FilterSelect, SearchBox, useQueryState } from './filters.jsx';
import { actions, useStore } from './store.js';
import { login, passwordStrength, redirectTarget, register } from './auth.js';
import { EmptyState, flyToCart, useToast } from './ui.jsx';
import { Footer, Header, Headline, Icon, Label, Reveal, useParallax } from './shared.jsx';

export function Page({ current, label, lines, lead, children, narrow = false, titleClass = '', art }) {
  useParallax();
  useEffect(() => { document.title = `${lines.join(' ').replace(/\.$/, '')} — Fixzy`; }, [lines]);
  return (
    <>
      <Header current={current} />
      <main id="main">
        <section className="page-hero">
          <div className="wrap">
            <Label>{label}</Label>
            <Headline as="h1" className={`page-title ${titleClass}`} lines={lines} now />
            {lead && <Reveal as="p" delay={300} className="lead page-lead">{lead}</Reveal>}
          </div>
          {art && <img className="page-art" src={art} alt="" data-speed="0.05" />}
        </section>
        <div className={`wrap page-body${narrow ? ' is-narrow' : ''}`}>{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function Field({ label, id, type = 'text', hint, ...rest }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} type={type} {...rest} />
      {hint && <small>{hint}</small>}
    </div>
  );
}

function AuthShell({ current, label, lines, lead, children, alt }) {
  return (
    <Page current={current} label={label} lines={lines} lead={lead} narrow>
      <Reveal className="auth-card">{children}</Reveal>
      <p className="auth-alt">{alt}</p>
    </Page>
  );
}

function PasswordField({ label, id, autoComplete, value, onChange, meter = false }) {
  const [show, setShow] = useState(false);
  const strength = meter ? passwordStrength(value || '') : 0;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} name={id} type={show ? 'text' : 'password'} autoComplete={autoComplete} minLength={8} required value={value} onChange={onChange} />
        <button type="button" className="text-link" aria-pressed={show} onClick={() => setShow((v) => !v)}>{show ? 'Hide' : 'Show'}</button>
      </div>
      {meter && value && <span className={`meter s${strength}`} aria-label={`Password strength ${['very weak', 'weak', 'fair', 'good', 'strong'][strength]}`}><i /><i /><i /><i /></span>}
    </div>
  );
}

function useSubmit(run) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const msg = await run(Object.fromEntries(new FormData(e.currentTarget)), e.currentTarget);
    if (msg) { setError(msg); setBusy(false); }
  };
  return { error, busy, onSubmit };
}

export function Login() {
  const [pw, setPw] = useState('');
  const { error, busy, onSubmit } = useSubmit(async (d) => {
    const msg = await login({ email: d.email, password: pw });
    if (!msg) window.location.assign(redirectTarget());
    return msg;
  });
  const q = window.location.search;
  return (
    <AuthShell current="login" label="Welcome back" lines={['Sign in.']} lead="Sign in to your account to continue."
      alt={<>Don’t have an account? <a href={`/register${q}`}>Create account</a></>}>
      <form className="form" onSubmit={onSubmit}>
        <Field label="Email address" id="email" type="email" autoComplete="email" required />
        <PasswordField label="Password" id="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <div className="form-row"><a className="text-link" href="/forgot-password">Forgot password?</a></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="pill pill-block" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <Icon name="arrow-right" size={16} /></button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const { error, busy, onSubmit } = useSubmit(async (d) => {
    if (pw !== pw2) return 'The two passwords do not match.';
    const msg = await register({ name: d.name, email: d.email, phone: d.phone, password: pw });
    if (!msg) window.location.assign(redirectTarget());
    return msg;
  });
  const q = window.location.search;
  return (
    <AuthShell current="register" label="Get started" lines={['Create your', 'account.']} lead="Book trusted home services in a few taps."
      alt={<>Already have an account? <a href={`/login${q}`}>Sign in</a></>}>
      <form className="form" onSubmit={onSubmit}>
        <Field label="Full name" id="name" autoComplete="name" required />
        <Field label="Email address" id="email" type="email" autoComplete="email" required />
        <Field label="Phone number" id="phone" type="tel" autoComplete="tel" pattern="[0-9+\s\-]{8,}" title="At least 8 digits" required />
        <div className="field-pair">
          <PasswordField label="Password" id="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} meter />
          <PasswordField label="Confirm password" id="confirm_password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="pill pill-block" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'} <Icon name="arrow-right" size={16} /></button>
      </form>
    </AuthShell>
  );
}

/* Self-service reset needs an email provider, which the API doesn't have yet. */
export function ForgotPassword() {
  return (
    <AuthShell current="login" label="Account" lines={['Reset your', 'password.']} lead="Password reset by email isn’t available yet."
      alt={<>Remembered it? <a href="/login">Back to sign in</a></>}>
      <p role="status">Please <a className="text-link" href="/contact">contact support</a> from the email address on your account and we’ll help you get back in.</p>
    </AuthShell>
  );
}

const SVC_DEFAULTS = { q: '', cat: '', max: '', rating: '', sort: 'popular' };
const SVC_SORT = {
  popular: (a, b) => b.reviews - a.reviews,
  rating: (a, b) => b.rating - a.rating,
  low: (a, b) => a.from - b.from,
  high: (a, b) => b.from - a.from,
  name: (a, b) => a.name.localeCompare(b.name),
};

export function ServicesPage() {
  const [f, set, reset, active] = useQueryState(SVC_DEFAULTS);
  const q = f.q.trim().toLowerCase();
  const visible = useMemo(() => services
    .filter((s) => (!q || `${s.name} ${s.description} ${s.terms}`.toLowerCase().includes(q))
      && (!f.cat || s.category === f.cat)
      && (!f.max || s.from <= Number(f.max))
      && (!f.rating || s.rating >= Number(f.rating)))
    .sort(SVC_SORT[f.sort] || SVC_SORT.popular), [q, f.cat, f.max, f.rating, f.sort]);
  const chips = [
    f.q && { label: `“${f.q}”`, clear: () => set({ q: '' }) },
    f.cat && { label: f.cat, clear: () => set({ cat: '' }) },
    f.max && { label: `Up to ${rupee(Number(f.max))}`, clear: () => set({ max: '' }) },
    f.rating && { label: `${f.rating}★ & up`, clear: () => set({ rating: '' }) },
  ].filter(Boolean);
  const suggestions = useMemo(() => services.flatMap((s) => [s.name, ...s.terms.split(' ').slice(0, 2)]), []);
  return (
    <Page current="services" label="Services" lines={['Every service,', 'one place.']} lead="Choose a service to see its starting price and book a visit." art="/assets/img/booking-phone.webp">
      <div className="toolbar svc-bar">
        <SearchBox id="svc-q" label="Search services" placeholder="Search services" value={f.q} onChange={(v) => set({ q: v })} suggestions={suggestions} />
        <div className="chips" role="group" aria-label="Category">
          <button type="button" className={`chip${f.cat === '' ? ' is-on' : ''}`} onClick={() => set({ cat: '' })}>All</button>
          {serviceCategories.map((c) => <button key={c} type="button" className={`chip${f.cat === c ? ' is-on' : ''}`} onClick={() => set({ cat: c })}>{c}</button>)}
        </div>
        <div className="filter-row">
          <FilterSelect id="svc-max" label="Price" value={f.max} onChange={(v) => set({ max: v })} options={[['', 'Any'], ['500', 'Up to ₹500'], ['700', 'Up to ₹700'], ['1000', 'Up to ₹1,000']]} />
          <FilterSelect id="svc-rating" label="Rating" value={f.rating} onChange={(v) => set({ rating: v })} options={[['', 'Any'], ['4.5', '4.5★ & up'], ['4.7', '4.7★ & up']]} />
          <FilterSelect id="svc-sort" label="Sort" value={f.sort} onChange={(v) => set({ sort: v })} options={[['popular', 'Most booked'], ['rating', 'Top rated'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['name', 'Name A–Z']]} />
        </div>
        <ActiveFilters items={chips} onReset={reset} />
        <p className="count-note" role="status">{visible.length} of {services.length} services</p>
      </div>
      <div className="service-list swap" key={JSON.stringify(f)}>
        {visible.map((s, i) => (
          <a key={s.id} className="service-row" style={{ '--i': i }} href={`/service-request?service_id=${s.id}`}>
            <span className="service-name">{s.name}</span>
            <span className="service-desc">{s.description}<small className="svc-meta">★ {s.rating} · {s.reviews} reviews · about {s.duration} min</small></span>
            <span className="service-price">From {s.price} / hr</span>
            <span className="service-arrow" aria-hidden="true"><Icon name="arrow-up-right" size={22} /></span>
          </a>
        ))}
      </div>
      <section className="pros" aria-labelledby="pros-h">
        <h2 className="h2" id="pros-h">Meet our pros</h2>
        <p className="muted">Sample profiles shown until real professionals join.</p>
        <ul className="pro-grid">
          {providers.map((p) => (
            <li key={p.id} className="pro">
              <Avatar name={p.name} />
              <div>
                <h3>{p.name} {p.verified && <span className="verified" title="Identity verified"><Icon name="shield-check" size={16} /><span className="visually-hidden">Verified</span></span>}</h3>
                <Stars value={p.rating} />
                <p>{p.jobs} jobs · {p.years} yrs · replies in {p.response}</p>
                <p>{p.serviceIds.map((id) => services.find((s) => s.id === id)?.name).join(', ')}</p>
                <a className="pill pill-small" href={`/service-request?service_id=${p.serviceIds[0]}&pro=${p.id}`}>Book this pro <Icon name="arrow-right" size={14} /></a>
              </div>
            </li>
          ))}
        </ul>
      </section>
      {visible.length === 0 && (
        <EmptyState title="No services match" text={active ? 'Try loosening a filter.' : 'Try another word.'}
          action={<button type="button" className="pill" onClick={reset}>Clear filters</button>} />
      )}
    </Page>
  );
}

function ProductTile({ p, index }) {
  return (
    <Reveal as="li" delay={(index % 4) * 80} className="product">
      <a href={`/product?id=${p.id}`}>
        <span className={`product-art tone-${p.id % 4}`}>
          <span className="product-cat">{p.category}</span>
          <img className="product-img" style={{ viewTransitionName: `prod-${p.id}` }} src={p.img} alt="" loading="lazy" />
          <span className="badge">{discount(p)}% off</span>
        </span>
        <span className="product-name">{p.name}</span>
        <span className="product-seller">{p.seller}</span>
        <span className="product-price"><b>{rupee(p.price)}</b><s>{rupee(p.old)}</s></span>
      </a>
      <HeartButton id={p.id} name={p.name} />
    </Reveal>
  );
}

const SHOP_DEFAULTS = { q: '', cat: '', sort: 'latest', min: '', max: '', seller: '' };
const SELLERS = [...new Set(products.map((p) => p.seller))];
const SHOP_SORT = {
  latest: (a, b) => b.id - a.id,
  low: (a, b) => a.price - b.price,
  high: (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name),
};

export function Shop() {
  const [f, set, reset] = useQueryState(SHOP_DEFAULTS);
  const list = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const min = f.min === '' ? 0 : Number(f.min);
    const max = f.max === '' ? Infinity : Number(f.max);
    return products
      .filter((p) => (!f.cat || p.category === f.cat) && (!f.seller || p.seller === f.seller) && p.price >= min && p.price <= max
        && (!q || `${p.name} ${p.seller} ${p.category}`.toLowerCase().includes(q)))
      .sort(SHOP_SORT[f.sort] || SHOP_SORT.latest);
  }, [f]);
  const chips = [
    f.q && { label: `“${f.q}”`, clear: () => set({ q: '' }) },
    f.cat && { label: f.cat, clear: () => set({ cat: '' }) },
    f.seller && { label: f.seller, clear: () => set({ seller: '' }) },
    (f.min || f.max) && { label: `${f.min ? rupee(Number(f.min)) : '₹0'} – ${f.max ? rupee(Number(f.max)) : 'any'}`, clear: () => set({ min: '', max: '' }) },
  ].filter(Boolean);
  const suggestions = useMemo(() => [...products.map((p) => p.name), ...SELLERS, ...categories], []);

  return (
    <Page current="shop" label="Marketplace" lines={['Useful finds', 'for living.']} lead="Curated products from verified sellers.">
      <div className="toolbar shop-bar">
        <SearchBox id="shop-q" label="Search products" placeholder="Search products" value={f.q} onChange={(v) => set({ q: v })} suggestions={suggestions} />
        <div className="chips" role="group" aria-label="Category">
          <button type="button" className={`chip${f.cat === '' ? ' is-on' : ''}`} onClick={() => set({ cat: '' })}>All</button>
          {categories.map((c) => (
            <button key={c} type="button" className={`chip${f.cat === c ? ' is-on' : ''}`} onClick={() => set({ cat: c })}>{c}</button>
          ))}
        </div>
        <div className="filter-row">
          <FilterSelect id="seller" label="Seller" value={f.seller} onChange={(v) => set({ seller: v })} options={[['', 'All sellers'], ...SELLERS.map((s) => [s, s])]} />
          <div className="filter-select price-range">
            <label htmlFor="pmin">Price (₹)</label>
            <div><input id="pmin" type="number" min="0" inputMode="numeric" placeholder="Min" value={f.min} onChange={(e) => set({ min: e.target.value })} /><span aria-hidden="true">–</span><input id="pmax" aria-label="Maximum price" type="number" min="0" inputMode="numeric" placeholder="Max" value={f.max} onChange={(e) => set({ max: e.target.value })} /></div>
          </div>
          <FilterSelect id="sort" label="Sort" value={f.sort} onChange={(v) => set({ sort: v })} options={[['latest', 'Latest'], ['low', 'Price: Low to High'], ['high', 'Price: High to Low'], ['name', 'Name A–Z']]} />
        </div>
        <ActiveFilters items={chips} onReset={reset} />
        <p className="count-note" role="status">{list.length} of {products.length} products</p>
      </div>
      {list.length ? (
        <ul className="product-grid swap" key={JSON.stringify(f)}>{list.map((p, i) => <ProductTile key={p.id} p={p} index={i} />)}</ul>
      ) : <EmptyState title="No products match" text="Try a wider price range or another category." action={<button type="button" className="pill" onClick={reset}>Clear filters</button>} />}
    </Page>
  );
}

export function Product() {
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  const p = products.find((x) => x.id === id);
  const [qty, setQty] = useState(1);
  const toast = useToast();
  const [added, setAdded] = useState(false);
  const related = products.filter((x) => p && x.id !== p.id && x.seller === p.seller).slice(0, 3);

  if (!p) {
    return (
      <Page current="shop" label="Marketplace" lines={['Product', 'not found.']} lead="That product isn’t available any more.">
        <a className="pill" href="/shop">Back to shop <Icon name="arrow-right" size={16} /></a>
      </Page>
    );
  }
  return (
    <Page current="shop" label={p.category} lines={[p.name]} lead={null} titleClass="is-long">
      <nav className="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/shop">Shop</a><span>/</span><span>{p.name}</span></nav>
      <div className="detail">
        <Reveal className={`detail-art tone-${p.id % 4}`}>
          <img className="product-img" style={{ viewTransitionName: `prod-${p.id}` }} src={p.img} alt={p.name} loading="lazy" />
          <span className="badge">{discount(p)}% off</span>
        </Reveal>
        <Reveal delay={120} className="detail-info">
          <p className="product-seller">Sold by {p.seller}</p>
          <p className="detail-price"><b>{rupee(p.price)}</b><s>{rupee(p.old)}</s></p>
          <p className="detail-desc">{p.blurb || `${p.category} from ${p.seller}.`}</p>
          <p className="stock"><Icon name="check" size={16} /> In stock</p>
          <form className="buy" onSubmit={(e) => { e.preventDefault(); flyToCart(document.querySelector('.detail-art .product-img')); setAdded(true); setTimeout(() => setAdded(false), 1600); actions.addToCart(p.id, qty); toast(`${p.name} added to cart`, { tone: 'success', action: { label: 'View cart', run: () => window.dispatchEvent(new Event('fixzy:open-cart')) } }); }}>
            <div className="qty">
              <label htmlFor="qty">Quantity</label>
              <div>
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
                <input id="qty" name="quantity" type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((n) => n + 1)}>+</button>
              </div>
            </div>
            <div className="buy-actions">
              <button className={`pill${added ? ' is-added' : ''}`} type="submit" name="action" value="add_to_cart"><Icon name={added ? 'check' : 'cart'} size={16} /> {added ? 'Added' : 'Add to cart'}</button>
              <HeartButton id={p.id} name={p.name} />
              <a className="pill pill-outline" href={`/checkout?product_id=${p.id}&quantity=${qty}`} onClick={() => actions.addToCart(p.id, qty)}>Buy now <Icon name="arrow-right" size={16} /></a>
            </div>
          </form>
        </Reveal>
      </div>
      <Reviews kind="product" target={p.id} />
      {related.length > 0 && (
        <section className="related" aria-labelledby="rel">
          <h2 className="h2" id="rel">More from this seller</h2>
          <ul className="product-grid">{related.map((r, i) => <ProductTile key={r.id} p={r} index={i} />)}</ul>
        </section>
      )}
    </Page>
  );
}

export function Help() {
  const faq = [
    ['How do I book a service?', 'Choose a service, sign in and send a request. We show the starting price before you continue.'],
    ['How is pricing worked out?', 'Each service lists an hourly starting rate. The final amount depends on the time and work involved.'],
    ['Where can I see my bookings?', 'Sign in and open Bookings to follow the status of every request.'],
    ['Can I change or cancel a booking?', 'Yes. Open Bookings, then choose Reschedule or Cancel while the job is still open.'],
    ['How do I buy from the marketplace?', 'Open a product, pick a quantity and add it to your cart or buy it straight away.'],
  ];
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const shown = faq.filter(([a, b]) => !term || `${a} ${b}`.toLowerCase().includes(term));
  return (
    <Page current="help" label="Support" lines={['How can', 'we help?']} lead="Quick answers to the most common questions." narrow>
      <div className="search faq-search">
        <label className="visually-hidden" htmlFor="faq-q">Search help</label>
        <input id="faq-q" type="search" placeholder="Search help" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="faq" aria-live="polite">
        {shown.map(([a, b]) => (
          <details key={a}><summary>{a}<Icon name="arrow-right" size={18} /></summary><p>{b}</p></details>
        ))}
        {shown.length === 0 && <EmptyState title="No answers found" text="Try different words, or contact us." />}
      </div>
      <p className="auth-alt">Still stuck? <a href="/contact">Contact us</a></p>
    </Page>
  );
}

export function Contact() {
  const user = useStore((st) => st.user);
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', message: '' });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.message.trim().length < 10) next.message = 'Tell us a little more (at least 10 characters).';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await actions.sendMessage({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() });
      setSent(true);
      toast('Message sent', { tone: 'success' });
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page current="help" label="Support" lines={['Get in', 'touch.']} lead="We usually reply within one working day." narrow>
      <Reveal className="auth-card">
        {sent ? (
          <div role="status" className="sent">
            <h2 className="h2">Thanks, {form.name.split(' ')[0]}.</h2>
            <p>Your message has been received. We usually reply within one working day.</p>
            <button type="button" className="pill pill-outline" onClick={() => { setSent(false); setForm((f) => ({ ...f, message: '' })); }}>Send another</button>
          </div>
        ) : (
          <form className="form" onSubmit={submit} noValidate>
            <Field label="Your name" id="name" value={form.name} onChange={set('name')} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'e-name' : undefined} required />
            {errors.name && <p className="form-error" id="e-name" role="alert">{errors.name}</p>}
            <Field label="Email address" id="email" type="email" value={form.email} onChange={set('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'e-email' : undefined} required />
            {errors.email && <p className="form-error" id="e-email" role="alert">{errors.email}</p>}
            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" rows="5" value={form.message} onChange={set('message')} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'e-msg' : undefined} required />
            </div>
            {errors.message && <p className="form-error" id="e-msg" role="alert">{errors.message}</p>}
            <button className="pill pill-block" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'} <Icon name="mail" size={16} /></button>
          </form>
        )}
      </Reveal>
    </Page>
  );
}

export function Privacy() {
  const sections = [
    ['What we collect', 'Your name, email, phone number and the details of the services and products you request.'],
    ['How we use it', 'To create your account, arrange visits, process orders and contact you about them.'],
    ['Sharing', 'Details are shared with the professional or seller handling your request, and only for that purpose.'],
    ['Your choices', 'You can ask us to update or delete your account at any time via the contact page.'],
  ];
  return (
    <Page current="help" label="Legal" lines={['Privacy', 'policy.']} lead="How Fixzy handles your information." narrow>
      <div className="prose">
        {sections.map(([h, t]) => <section key={h}><h2>{h}</h2><p>{t}</p></section>)}
      </div>
    </Page>
  );
}
