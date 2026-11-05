import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { loginUrl } from './auth.js';
import { isoDay, providers, rupee, services, slots } from './data.js';
import { Field, Page } from './pages.jsx';
import { Icon, Reveal, cartLines, cartTotal } from './shared.jsx';
import { actions, useStore } from './store.js';
import { EmptyState, useToast } from './ui.jsx';

const COUPONS = { FIXZY10: 0.1 };

/* ---------- Checkout ---------- */
export function Checkout() {
  const cart = useStore((s) => s.cart);
  const toast = useToast();
  const user = useStore((s) => s.user);
  useEffect(() => { if (!user) window.location.replace(loginUrl('checkout')); }, [user]);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState('');
  const [placed, setPlaced] = useState(null);
  const lines = cartLines(cart);
  const subtotal = cartTotal(lines);
  const off = Math.round(subtotal * (COUPONS[applied] || 0));

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (COUPONS[code]) { setApplied(code); toast(`${code} applied`, { tone: 'success' }); }
    else toast('That code isn’t valid', { tone: 'error' });
  };
  const [busy, setBusy] = useState(false);
  const place = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const order = await api('/orders', {
        method: 'POST',
        body: { name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim(), city: f.city.trim(), pin: f.pin.trim(), coupon: applied || undefined, items: cart.map((i) => ({ productId: i.id, qty: i.qty })) },
      });
      setPlaced({ id: order.id, total: order.total });
      actions.clearCart();
    } catch (err) {
      toast(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  if (placed) {
    return (
      <Page current="shop" label="Checkout" lines={['Order', 'placed.']} lead={`Order ${placed.id} · ${rupee(placed.total)} to pay on delivery.`}>
        <a className="pill" href="/shop">Keep shopping <Icon name="arrow-right" size={16} /></a>
      </Page>
    );
  }
  return (
    <Page current="shop" label="Checkout" lines={['Almost', 'there.']} lead="Review your order and tell us where to deliver.">
      {lines.length === 0 ? (
        <EmptyState title="Your cart is empty" text="Add something from the marketplace first." action={<a className="pill" href="/shop">Browse marketplace</a>} />
      ) : (
        <div className="checkout">
          <form className="form" onSubmit={place}>
            <Field label="Full name" id="name" autoComplete="name" required />
            <Field label="Phone number" id="phone" type="tel" autoComplete="tel" required />
            <Field label="Delivery address" id="address" autoComplete="street-address" required />
            <div className="field-pair">
              <Field label="City" id="city" autoComplete="address-level2" required />
              <Field label="PIN code" id="pin" inputMode="numeric" pattern="[0-9]{6}" title="6-digit PIN code" autoComplete="postal-code" required />
            </div>
            <fieldset className="pay"><legend>Payment</legend>
              <label className="check"><input type="radio" name="pay" defaultChecked /><span>Cash on delivery</span></label>
            </fieldset>
            <button className="pill pill-block" type="submit" disabled={busy}>{busy ? 'Placing order…' : `Place order · ${rupee(subtotal - off)}`} <Icon name="arrow-right" size={16} /></button>
          </form>
          <aside className="summary" aria-label="Order summary">
            <h2>Summary</h2>
            <ul className="cart-lines">
              {lines.map((l) => (
                <li key={l.id} className="cart-line"><img src={l.p.img} alt="" /><div><span>{l.p.name}</span><span>{l.qty} × {rupee(l.p.price)}</span></div></li>
              ))}
            </ul>
            <div className="coupon">
              <label className="visually-hidden" htmlFor="coupon">Coupon code</label>
              <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code (try FIXZY10)" />
              <button type="button" className="pill pill-outline pill-small" onClick={applyCoupon}>Apply</button>
            </div>
            <div className="cart-total"><span>Subtotal</span><b>{rupee(subtotal)}</b></div>
            {off > 0 && <div className="cart-total"><span>Discount</span><b>−{rupee(off)}</b></div>}
            <div className="cart-total"><span>Total</span><b>{rupee(subtotal - off)}</b></div>
          </aside>
        </div>
      )}
    </Page>
  );
}

/* ---------- Booking wizard ---------- */
const STEPS = ['Service', 'Date & time', 'Details', 'Confirm'];
const nextDays = (n) => Array.from({ length: n }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() + i + 1); return d;
});

export function ServiceRequest() {
  const params = new URLSearchParams(window.location.search);
  const pro = providers.find((p) => p.id === Number(params.get('pro')));
  const initial = Number(params.get('service_id')) || pro?.serviceIds[0] || 0;
  const [step, setStep] = useState(initial ? 1 : 0);
  const [serviceId, setServiceId] = useState(initial);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState('');
  const user = useStore((s) => s.user);
  useEffect(() => { if (!user) window.location.replace(loginUrl('service-request', initial ? `&service_id=${initial}` : '')); }, [user, initial]);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: '', notes: '' });
  const [done, setDone] = useState(null);
  const days = useMemo(() => nextDays(7), []);
  const service = services.find((s) => s.id === serviceId);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const canNext = [!!service, !!day && !!slot, form.name.trim() && /^[0-9+\s-]{8,}$/.test(form.phone) && form.address.trim(), true][step];

  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = async () => {
    setBusy(true);
    try {
      await actions.addBooking({ providerId: pro?.id, serviceId, day, slot, name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim(), notes: form.notes.trim() });
      setDone(true);
    } catch (err) {
      toast(err.message, { tone: 'error' });
      if (err.status === 409) { setSlot(''); setStep(1); }
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;
  if (done) {
    return (
      <Page current="orders" label="Booking" lines={['Request', 'sent.']} lead={`${service.name} on ${day} at ${slot}. A pro will confirm shortly.`}>
        <Reveal className="done"><svg className="done-check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg></Reveal>
        <a className="pill" href="/orders">View bookings <Icon name="arrow-right" size={16} /></a>
      </Page>
    );
  }
  return (
    <Page current="services" label="Book a service" lines={['Book a', 'visit.']} lead="Four quick steps. You pay after the work is done.">
      <ol className="steps" aria-label="Progress">
        {STEPS.map((s, i) => <li key={s} className={i === step ? 'is-now' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>{s}</li>)}
      </ol>
      <div className="wizard" key={step}>
        {step === 0 && (
          <div className="pick" role="group" aria-label="Service">
            {services.map((s) => (
              <button key={s.id} type="button" aria-pressed={serviceId === s.id} className={`chip chip-lg${serviceId === s.id ? ' is-on' : ''}`} onClick={() => setServiceId(s.id)}>
                {s.name} <small>from {s.price}</small>
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <>
            <div className="pick" role="group" aria-label="Day">
              {days.map((d) => (
                <button key={isoDay(d)} type="button" aria-pressed={day === isoDay(d)} className={`chip chip-lg${day === isoDay(d) ? ' is-on' : ''}`} onClick={() => setDay(isoDay(d))}>
                  {d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </button>
              ))}
            </div>
            <div className="pick" role="group" aria-label="Time">
              {slots.map((t) => (
                <button key={t} type="button" aria-pressed={slot === t} className={`chip chip-lg${slot === t ? ' is-on' : ''}`} onClick={() => setSlot(t)}>{t}</button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <div className="form">
            <Field label="Full name" id="b-name" value={form.name} onChange={set('name')} autoComplete="name" required />
            <Field label="Phone number" id="b-phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required />
            <Field label="Address" id="b-address" value={form.address} onChange={set('address')} autoComplete="street-address" required />
            <div className="field"><label htmlFor="b-notes">What needs fixing? (optional)</label><textarea id="b-notes" rows="3" value={form.notes} onChange={set('notes')} /></div>
          </div>
        )}
        {step === 3 && (
          <dl className="review">
            <dt>Service</dt><dd>{service.name}</dd>
            {pro && <><dt>Pro</dt><dd>{pro.name}</dd></>}
            <dt>When</dt><dd>{day} at {slot}</dd>
            <dt>Where</dt><dd>{form.address}</dd>
            <dt>Contact</dt><dd>{form.name} · {form.phone}</dd>
            <dt>Estimate</dt><dd>From {service.price} / hr · about {service.duration} min</dd>
          </dl>
        )}
      </div>
      <div className="wizard-nav">
        {step > 0 && <button type="button" className="pill pill-outline" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3
          ? <button type="button" className="pill" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue <Icon name="arrow-right" size={16} /></button>
          : <button type="button" className="pill" disabled={busy} onClick={confirm}>{busy ? 'Booking…' : 'Confirm booking'} <Icon name="check" size={16} /></button>}
      </div>
    </Page>
  );
}
