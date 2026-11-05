import { useCallback, useEffect, useRef, useState } from 'react';

const SLIDES = [
  { lines: ['Fixzy.'], note: 'Home services, made simple', theme: 'dark' },
  { lines: ['Trusted pros', 'for your home.'], note: 'Plumbing, electrical, AC, cleaning and more', theme: 'sage' },
  { lines: ['See the price', 'first.'], note: 'Every service shows its starting price', theme: 'light' },
  { lines: ['Book a time', 'that suits you.'], note: 'Sign in, request a visit, track it online', theme: 'dark' },
  { lines: ['Let’s begin.'], note: 'Choose a service on the next screen', theme: 'sage' },
];

const DURATION = 1700;
const LOCK = 450;

export default function Intro({ onDone }) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const lockRef = useRef(0);
  const leavingRef = useRef(false);
  const touchY = useRef(null);
  const fillRef = useRef(null);
  const skipRef = useRef(null);
  const [percent, setPercent] = useState(0);
  const last = SLIDES.length - 1;

  const finish = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);
    setTimeout(onDone, 850);
  }, [onDone]);

  const go = useCallback((dir) => {
    if (leavingRef.current) return;
    const now = Date.now();
    if (now - lockRef.current < LOCK) return;
    lockRef.current = now;
    setIndex((i) => Math.max(0, Math.min(last, i + dir)));
    if (dir > 0 && indexRef.current === last) finish();
  }, [finish, last]);

  const indexRef = useRef(0);
  useEffect(() => { indexRef.current = index; }, [index]);

  useEffect(() => {
    if (leaving) return undefined;
    const t = setTimeout(() => go(1), DURATION);
    return () => clearTimeout(t);
  }, [index, leaving, go]);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    const behind = [...document.querySelectorAll('#root > :not(.intro)')];
    behind.forEach((el) => { el.inert = true; });
    skipRef.current?.focus();
    const key = (e) => {
      if (e.target.closest?.('a, button, input')) { if (e.key === 'Escape') finish(); return; }
      if (e.key === 'Escape') finish();
      else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1); }
    };
    const wheel = (e) => { if (Math.abs(e.deltaY) > 8) go(e.deltaY > 0 ? 1 : -1); };
    window.addEventListener('keydown', key);
    window.addEventListener('wheel', wheel, { passive: true });
    return () => {
      document.documentElement.style.overflow = '';
      behind.forEach((el) => { el.inert = false; });
      window.removeEventListener('keydown', key);
      window.removeEventListener('wheel', wheel);
    };
  }, [go, finish]);

  // Fake loader: read the animated bar's real width so the number tracks it.
  useEffect(() => {
    let frame;
    const tick = () => {
      const fill = fillRef.current;
      if (fill?.parentElement) setPercent(Math.round((fill.offsetWidth / fill.parentElement.offsetWidth) * 100));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const slide = SLIDES[index];

  return (
    <div
      className={`intro theme-${slide.theme}${leaving ? ' is-leaving' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Fixzy"
      onClick={() => go(1)}
      onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        const dy = touchY.current - e.changedTouches[0].clientY;
        if (Math.abs(dy) > 40) go(dy > 0 ? 1 : -1);
      }}
    >
      <div className="intro-top">
        <span className="intro-brand">Fixzy</span>
        <a
          ref={skipRef}
          className="intro-skip"
          href="#main"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); finish(); }}
        >
          Skip
        </a>
      </div>

      {SLIDES.map((s, i) => {
        const state = i === index ? 'is-active' : i < index ? 'is-past' : 'is-next';
        let w = 0;
        return (
          <div className={`intro-slide ${state}`} key={i} aria-hidden={i !== index}>
            <h2 className="intro-title">
              {s.lines.map((line) => (
                <span className="intro-line" key={line}>
                  <span className="intro-word" style={{ '--i': w++ }}>{line}</span>
                </span>
              ))}
            </h2>
            <p className="intro-note">{s.note}</p>
          </div>
        );
      })}

      <div className="intro-bottom" aria-hidden="true">
        <span>Loading</span>
        <span className="intro-count">{percent}%</span>
        <div className="intro-loader" aria-hidden="true">
          <u ref={fillRef} style={{ width: `${((index + 1) / SLIDES.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
