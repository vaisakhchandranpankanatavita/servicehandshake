import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import Lenis from 'lenis';
import App from './App.jsx';
/* Each group of pages is its own chunk, so the home page doesn't download the shop, auth or booking code. */
const fromModule = (load, name) => lazy(() => load().then((m) => ({ default: m[name] })));
const pages = () => import('./pages.jsx');
const account = () => import('./account.jsx');
const flows = () => import('./flows.jsx');
const track = () => import('./track.jsx');
const provider = () => import('./provider.jsx');
import { ToastProvider } from './ui.jsx';
import '../assets/css/redesign.css';
import '../assets/css/pages.css';

/* Each PHP entry (login, shop, …) serves this same shell; the page is chosen from the URL. */
const ROUTES = {
  'login': fromModule(pages, 'Login'),
  'register': fromModule(pages, 'Register'),
  'forgot-password': fromModule(pages, 'ForgotPassword'),
  'services': fromModule(pages, 'ServicesPage'),
  'shop': fromModule(pages, 'Shop'),
  'product': fromModule(pages, 'Product'),
  'help': fromModule(pages, 'Help'),
  'contact': fromModule(pages, 'Contact'),
  'privacy': fromModule(pages, 'Privacy'),
  'orders': fromModule(account, 'Orders'),
  'dashboard': fromModule(account, 'Dashboard'),
  'track': fromModule(track, 'Track'),
  'provider': fromModule(provider, 'ProviderApp'),
  'checkout': fromModule(flows, 'Checkout'),
  'service-request': fromModule(flows, 'ServiceRequest'),
};

/* Smooth, inertial wheel scrolling (skipped for reduced motion); in-page anchors glide too. */
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const lenis = new Lenis({ lerp: 0.1, anchors: { offset: -72 } });
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

/* Primary buttons lean a few pixels toward the cursor (fine pointers only, never with reduced motion). */
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const reset = (el) => { el.style.removeProperty('--mx'); el.style.removeProperty('--my'); };
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('.pill:not(.pill-block):not([disabled])');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
  });
  document.addEventListener('pointerout', (e) => { const el = e.target.closest?.('.pill'); if (el && !el.contains(e.relatedTarget)) reset(el); });
}

const slug = window.location.pathname.split('/').pop().replace(/\.php$/, ''); // tolerate legacy .php links
const HOME_SLUGS = ['', 'index', 'home'];
const NotFound = () => (
  <main style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', textAlign: 'center', gap: 16, padding: 24 }}>
    <h1 style={{ fontSize: 'clamp(48px,10vw,120px)', fontWeight: 800, letterSpacing: '-.055em', lineHeight: .9, margin: 0 }}>404.</h1>
    <p>That page doesn’t exist.</p>
    <p><a className="pill" href="/">Back home</a></p>
  </main>
);
const Page = ROUTES[slug] || (HOME_SLUGS.includes(slug) ? App : NotFound);
if (Page === NotFound) document.title = 'Page not found — Fixzy';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider><Suspense fallback={null}><Page /></Suspense></ToastProvider>
  </React.StrictMode>,
);
