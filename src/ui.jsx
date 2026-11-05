import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* Shared UI primitives: toasts, skeletons, empty states, badges and a focus-trapped drawer. */

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    const duration = opts.duration || 4000;
    setItems((x) => [...x, { id, message, duration, action: opts.action, tone: opts.tone || 'info' }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), duration);
  }, []);
  const dismiss = (id) => setItems((x) => x.filter((t) => t.id !== id));
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} style={{ '--dur': `${t.duration}ms` }}>
            <span>{t.message}</span>
            {t.action && <button type="button" onClick={() => { t.action.run(); dismiss(t.id); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const Skeleton = ({ w = '100%', h = 16, r }) => (
  <span className="skeleton" aria-hidden="true" style={{ width: w, height: h, borderRadius: r }} />
);

export const Tag = ({ tone = 'neutral', children }) => <span className={`tag tag-${tone}`}>{children}</span>;

export const EmptyState = ({ title, text, action }) => (
  <div className="empty-state">
    <h2>{title}</h2>
    {text && <p>{text}</p>}
    {action}
  </div>
);

export function Drawer({ open, onClose, title, children }) {
  const ref = useRef(null);
  const last = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    last.current = document.activeElement;
    const node = ref.current;
    const focusables = () => node.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], end = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
      else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      last.current?.focus?.();
    };
  }, [open, onClose]);
  /* Portal out of the blurred sticky header, whose backdrop-filter would otherwise trap position:fixed. */
  return createPortal(
    <div className={`drawer-root${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-label={title} inert={!open}>
        <header><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close">×</button></header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

/* Animate a copy of an image from its spot to the header cart button (skipped for reduced motion). */
export function flyToCart(fromEl) {
  const cart = document.querySelector('.cart-btn[aria-label^="Open cart"]');
  if (!fromEl || !cart || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = fromEl.getBoundingClientRect();
  const b = cart.getBoundingClientRect();
  const ghost = fromEl.cloneNode(true);
  Object.assign(ghost.style, { position: 'fixed', left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px', margin: 0, zIndex: 95, pointerEvents: 'none', borderRadius: '16px', objectFit: 'cover' });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate(
    [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: .4 }],
    { duration: 700, easing: 'cubic-bezier(.5,0,.2,1)' },
  );
  anim.onfinish = () => ghost.remove();
  anim.oncancel = () => ghost.remove();
}
