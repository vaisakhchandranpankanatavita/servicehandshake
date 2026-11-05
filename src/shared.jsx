import { useEffect, useRef, useState } from 'react';
import { products, rupee } from './data.js';
import { actions, useStore } from './store.js';
import { Drawer, useToast } from './ui.jsx';

export const ICONS = {
  'arrow-right': <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  'arrow-up-right': <><path d="M7 7h10v10" /><path d="M7 17 17 7" /></>,
  briefcase: <><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" /></>,
  grid: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>,
  headset: <><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" /><path d="M21 16v2a4 4 0 0 1-4 4h-5" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  cart: <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>,
  calendar: <><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  mail: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  'shield-check': <><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>,
};

export function Icon({ name, size = 20 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}

export function useInView(options = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}

export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...props }) {
  const [ref, inView] = useInView();
  return (
    <Tag ref={ref} className={`reveal${inView ? ' is-visible' : ''} ${className}`.trim()} style={{ '--delay': `${delay}ms` }} {...props}>
      {children}
    </Tag>
  );
}

/* Scroll-linked parallax. Elements with [data-speed] drift by a fraction of the scroll distance through the
   independent `translate` property (via --py), so it never fights reveal/hover transforms.
   data-speed > 0 trails the scroll (reads as deeper); < 0 runs ahead.
   data-mode="top" measures from the page top (hero); otherwise from the viewport centre.
   data-limit caps travel as a fraction of height (keeps scaled images from exposing their edges);
   data-mobile="off" disables the effect on phones. Scroll is eased once and every layer derives from it,
   so all layers stay in sync. Reads and writes are split and positions cached, so frames never force layout. */
export function useParallax() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const hero = document.querySelector('[data-hero]');
    const items = [...document.querySelectorAll('[data-speed]')].map((node) => ({
      node,
      speed: parseFloat(node.dataset.speed) || 0,
      top: node.dataset.mode === 'top',
      limit: parseFloat(node.dataset.limit) || 0,
      phoneOff: node.dataset.mobile === 'off',
      home: 0, h: 0, y: 0,
    }));
    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let heroH = 1;
    let smooth = window.scrollY;
    let last = performance.now();
    let hpLast = -1;
    let frame = 0;

    const measure = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      heroH = hero ? hero.offsetHeight || 1 : 1;
      items.forEach((it) => {
        const rect = it.node.getBoundingClientRect();
        it.home = rect.top + window.scrollY - it.y;
        it.h = rect.height;
      });
    };

    const render = (now) => {
      frame = 0;
      const target = window.scrollY;
      const dt = Math.min(now - last, 64);
      last = now;
      smooth += (target - smooth) * (1 - Math.exp(-dt / 80));
      if (Math.abs(target - smooth) < 0.1) smooth = target;

      const intensity = vw < 700 ? 0.4 : vw < 1000 ? 0.65 : 1;
      const writes = [];
      items.forEach((it) => {
        let y = 0;
        let near = true;
        if (!(it.phoneOff && vw < 700)) {
          if (it.top) {
            y = Math.min(smooth, vh) * it.speed * intensity;
          } else {
            const d = it.home - smooth + it.h / 2 - vh / 2;
            near = Math.abs(d) < vh / 2 + it.h / 2 + 200;
            y = d * it.speed * intensity;
          }
          if (it.limit) {
            const cap = it.limit * it.h;
            y = Math.max(-cap, Math.min(cap, y));
          }
        }
        if (near && Math.abs(y - it.y) > 0.05) writes.push([it, y]);
      });
      writes.forEach(([it, y]) => {
        it.node.style.setProperty('--py', `${y.toFixed(2)}px`);
        it.y = y;
      });

      if (hero) {
        const hp = Math.max(0, Math.min(1, smooth / (heroH * 0.85)));
        if (Math.abs(hp - hpLast) > 0.002) {
          hero.style.setProperty('--hp', hp.toFixed(3));
          hpLast = hp;
        }
      }
      if (smooth !== target) frame = requestAnimationFrame(render);
    };

    const onScroll = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(render);
    };
    const onResize = () => { measure(); onScroll(); };

    measure();
    render(performance.now());
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onResize);
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
}

/* Headline whose lines rise out of a mask, as in the intro. A trailing "." renders in the accent colour. */
export function Headline({ as: Tag = 'h2', lines, id, className = '', now = false, ...rest }) {
  const [ref, inView] = useInView({ threshold: 0.35 });
  return (
    <Tag ref={ref} id={id} className={`headline${now || inView ? ' is-visible' : ''} ${className}`.trim()} {...rest}>
      {lines.map((line, i) => {
        const dot = line.endsWith('.');
        return (
          <span className="h-line" key={line}>
            <span className="h-word" style={{ '--i': i }}>{dot ? line.slice(0, -1) : line}{dot && <b className="dot">.</b>}</span>
          </span>
        );
      })}
    </Tag>
  );
}

export function Label({ children, delay = 0 }) {
  return <Reveal as="p" delay={delay} className="label"><span>{children}</span><i aria-hidden="true" /></Reveal>;
}

export const cartLines = (cart) => cart.map((i) => ({ ...i, p: products.find((x) => x.id === i.id) })).filter((l) => l.p);
export const cartTotal = (lines) => lines.reduce((n, l) => n + l.p.price * l.qty, 0);

function NotificationsDrawer({ open, onClose, user }) {
  const all = useStore((s) => s.notifications);
  const list = user ? all.filter((n) => n.owner === user.email) : [];
  useEffect(() => { if (open && user && list.some((n) => !n.read)) actions.markAllRead(user.email); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Drawer open={open} onClose={onClose} title="Notifications">
      {list.length === 0 ? (
        <div className="empty-state"><h3>You’re all caught up</h3><p>Booking updates will appear here.</p></div>
      ) : (
        <ul className="notes">
          {list.map((n) => (
            <li key={n.id}><a href={n.href || '#'}>{n.text}<small>{new Date(n.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></a></li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function CartDrawer({ open, onClose }) {
  const cart = useStore((s) => s.cart);
  const toast = useToast();
  const lines = cartLines(cart);
  const remove = (l) => {
    actions.removeFromCart(l.id);
    toast(`${l.p.name} removed`, { action: { label: 'Undo', run: () => actions.addToCart(l.id, l.qty) } });
  };
  return (
    <Drawer open={open} onClose={onClose} title="Your cart">
      {lines.length === 0 ? (
        <div className="empty-state"><h3>Your cart is empty</h3><p>Find something useful in the marketplace.</p><a className="pill" href="/shop">Browse marketplace</a></div>
      ) : (
        <>
          <ul className="cart-lines">
            {lines.map((l) => (
              <li key={l.id} className="cart-line">
                <img src={l.p.img} alt="" />
                <div>
                  <a href={`/product?id=${l.id}`}>{l.p.name}</a>
                  <span>{rupee(l.p.price)}</span>
                  <div className="qty-mini">
                    <button type="button" aria-label={`Decrease ${l.p.name}`} onClick={() => actions.setQty(l.id, l.qty - 1)}>−</button>
                    <output key={l.qty} aria-live="polite">{l.qty}</output>
                    <button type="button" aria-label={`Increase ${l.p.name}`} onClick={() => actions.setQty(l.id, l.qty + 1)}>+</button>
                    <button type="button" className="text-link" onClick={() => remove(l)}>Remove</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="cart-total"><span>Subtotal</span><b>{rupee(cartTotal(lines))}</b></div>
          <a className="pill pill-block" href="/checkout">Checkout <Icon name="arrow-right" size={16} /></a>
        </>
      )}
    </Drawer>
  );
}

export function Header({ current = '' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const toggleRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setMenuOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  const unread = useStore((s) => (s.user ? s.notifications.filter((n) => n.owner === s.user.email && !n.read).length : 0));
  const user = useStore((s) => s.user);
  const count = useStore((s) => s.cart.reduce((n, i) => n + i.qty, 0));
  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener('fixzy:open-cart', open);
    return () => window.removeEventListener('fixzy:open-cart', open);
  }, []);
  const [scrolled, setScrolled] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' menu-open' : ''}`}>
      <div className="header-inner">
        <a className="brand" href="/" aria-label="Fixzy home">Fixzy<b className="dot">.</b></a>
        <span className="brand-rule" aria-hidden="true" />
        <nav className="main-nav" id="main-nav" aria-label="Main navigation">
          <a href={current === 'home' ? '#services' : '/services'} onClick={closeMenu} aria-current={current === 'services' ? 'page' : undefined}>Services</a>
          <a href="/shop" onClick={closeMenu} aria-current={current === 'shop' ? 'page' : undefined}>Marketplace</a>
          <a href="/orders" onClick={closeMenu} aria-current={current === 'orders' ? 'page' : undefined}>Bookings</a>
          {!user && <a className="nav-mobile-only" href="/login">Sign in</a>}
        </nav>
        <div className="header-actions">
          {user && (
            <button type="button" className="cart-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => setNotesOpen(true)}>
              <Icon name="bell" size={20} />{unread > 0 && <b key={unread} className="cart-count">{unread}</b>}
            </button>
          )}
          <button type="button" className="cart-btn" aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`} onClick={() => setCartOpen(true)}>
            <Icon name="cart" size={20} />{count > 0 && <b key={count} className="cart-count">{count}</b>}
          </button>
          {user ? (
            <a className="pill pill-small" href="/dashboard">{user.name.split(' ')[0]} <Icon name="user" size={14} /></a>
          ) : (
            <>
              <a className="sign-in" href="/login">Sign in</a>
              <a className="pill pill-small" href="/register">Get started <Icon name="arrow-right" size={14} /></a>
            </>
          )}
        </div>
        <button ref={toggleRef} className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen((open) => !open)}>
          <span /><span />
        </button>
      </div>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <NotificationsDrawer open={notesOpen} onClose={() => setNotesOpen(false)} user={user} />
    </header>
    </>
  );
}

export function Footer() {
  const user = useStore((s) => s.user);
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <Headline id="cta-title" className="footer-cta" lines={['Ready to book?']} />
            <Reveal as="p" delay={150} className="footer-lead">Create a free account and request your first service.</Reveal>
          </div>
          <Reveal delay={250}><a className="pill pill-light" href={user ? '/services' : '/register'}>{user ? 'Book a service' : 'Create an account'} <Icon name="arrow-right" size={16} /></a></Reveal>
        </div>
        <div className="footer-main">
          <nav className="footer-column" aria-label="Explore"><h2>Explore</h2><a href="/services">Services</a><a href="/shop">Marketplace</a><a href="/orders">Bookings</a></nav>
          <nav className="footer-column" aria-label="Your account"><h2>Account</h2>{!user && <><a href="/login">Sign in</a><a href="/register">Create an account</a></>}<a href="/dashboard">Dashboard</a></nav>
          <nav className="footer-column" aria-label="Support"><h2>Support</h2><a href="/help">Help Center</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a></nav>
        </div>
        <div className="footer-bottom"><span>© 2026 Fixzy</span><span>Home services, sorted.</span></div>
      </div>
    </footer>
  );
}

export function CountUp({ value, suffix = '', prefix = '' }) {
  const [ref, inView] = useInView({ threshold: 0.6 });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setCurrent(value);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / 1600, 1);
      setCurrent(Math.round(value * (1 - Math.pow(1 - progress, 4))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <span className="count" ref={ref}>
      <span className="count-ghost" aria-hidden="true">{prefix}{value}{suffix}</span>
      <span className="count-now">{prefix}{current}{suffix}</span>
    </span>
  );
}
