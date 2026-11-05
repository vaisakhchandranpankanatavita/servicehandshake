import { useState } from 'react';
import Intro from './Intro.jsx';
import { services, slots } from './data.js';
import { CountUp, Footer, Header, Headline, Icon, Label, Reveal, useParallax } from './shared.jsx';

const IMG = {
  hero: '/assets/img/hero.webp',
  pick: '/assets/img/card-1.webp',
  compare: '/assets/img/card-2.webp',
  book: '/assets/img/card-3.webp',
  market: '/assets/img/market.webp',
};


/* Every figure here is true of the app today (service list, price list, booking wizard), unlike the old placeholder claims. */
const stats = [
  { value: services.length, label: 'Services' },
  { prefix: '₹', value: Math.min(...services.map((s) => s.from)), label: 'Starting price' },
  { value: 7, suffix: ' days', label: 'Booking window' },
  { value: slots.length, label: 'Daily slots' },
];

const CARD_SPEEDS = [0.02, -0.035, -0.09];

const steps = [
  { title: 'Pick.', text: 'Browse practical services for the things your home needs.', img: IMG.pick },
  { title: 'Compare.', text: 'See the listed starting price before you continue.', img: IMG.compare },
  { title: 'Book.', text: 'Sign in, request a service and manage your booking.', img: IMG.book },
];
function Hero({ query, onQueryChange, onSearch, ready }) {
  function submitSearch(event) {
    event.preventDefault();
    onSearch();
  }

  return (
    <section className="hero" aria-labelledby="hero-title" data-hero>
      <div className="hero-art" aria-hidden="true"><img src={IMG.hero} alt="" fetchPriority="high" decoding="async" data-speed="0.05" data-mode="top" data-limit="0.06" /></div>
      <div className="wrap hero-copy" data-speed="0.1" data-mode="top">
        <Label>Fixzy — Home services</Label>
        <Headline as="h1" id="hero-title" className="mega" lines={['Home', 'services,', 'sorted.']} now={ready} data-speed="0.07" data-mode="top" />
        <div className="hero-foot">
          <form className="search" role="search" onSubmit={submitSearch}>
            <label className="visually-hidden" htmlFor="service-query">Search home services</label>
            <input id="service-query" type="search" placeholder="What needs doing?" autoComplete="off" value={query} onChange={(event) => onQueryChange(event.target.value)} />
            <button type="submit" aria-label="Find a service"><Icon name="arrow-right" size={18} /></button>
          </form>
          <p className="hero-note">Browse services and starting prices before you book.</p>
        </div>
      </div>
    </section>
  );
}

function StatsStrip() {
  return (
    <section className="glance" aria-label="Fixzy at a glance">
      <div className="wrap">
        <dl className="glance-card">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 110} className="glance-item">
              <dt>{stat.label}</dt>
              <dd>
                <span className="glance-value"><CountUp value={stat.value} prefix={stat.prefix} suffix={stat.suffix} /></span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="how section" aria-labelledby="how-title">
      <div className="wrap how-grid">
        <div className="how-copy">
          <Label>01 — Services</Label>
          <Headline id="how-title" lines={['Pick.', 'Compare.', 'Book.']} />
          <Reveal as="p" delay={320} className="lead">Browse practical services for the things your home needs.</Reveal>
          <Reveal delay={420} className="cta"><a className="pill" href="#services">Explore services <Icon name="arrow-right" size={16} /></a></Reveal>
        </div>
        <ol className="cards">
          {steps.map((step, index) => (
            <Reveal as="li" key={step.title} delay={index * 120} className="card" data-speed={CARD_SPEEDS[index]} data-mobile="off">
              <a href="#services">
                <img src={step.img} alt="" loading="lazy" />
                <span className="visually-hidden">{step.title} {step.text}</span>
              </a>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Services({ query }) {
  const normalized = query.trim().toLowerCase();
  const visible = services.filter((s) => !normalized || `${s.name} ${s.description} ${s.terms}`.toLowerCase().includes(normalized));

  return (
    <section className="services section" id="services" aria-labelledby="services-title">
      <div className="wrap">
        <Reveal as="h2" id="services-title" className="h2">All services</Reveal>
        <Reveal as="p" delay={100} className="lead">Choose a service to see its starting price and book.</Reveal>
        <Reveal delay={200} className="service-list" aria-live="polite">
          {visible.map((service) => (
            <a key={service.id} className="service-row" href={`/service-request?service_id=${service.id}`}>
              <span className="service-name">{service.name}</span>
              <span className="service-desc">{service.description}</span>
              <span className="service-price">From {service.price}</span>
              <span className="service-arrow" aria-hidden="true"><Icon name="arrow-up-right" size={22} /></span>
            </a>
          ))}
        </Reveal>
        {visible.length === 0 && <p className="empty">Nothing found. Try another word.</p>}
      </div>
    </section>
  );
}

function Marketplace() {
  return (
    <section className="market section" aria-labelledby="market-title">
      <div className="wrap market-grid">
        <div className="market-copy" data-speed="-0.06" data-mobile="off">
          <Label>03 — Marketplace</Label>
          <Headline id="market-title" lines={['Useful finds', 'for living.']} />
          <Reveal as="p" delay={320} className="lead">Discover curated products and the essentials for a better home.</Reveal>
          <Reveal delay={420} className="cta"><a className="pill" href="/shop">Explore marketplace <Icon name="arrow-right" size={16} /></a></Reveal>
        </div>
        <Reveal as="a" className="market-art" href="/shop" aria-label="Browse the Fixzy marketplace">
          <img src={IMG.market} alt="A calm, naturally lit living room" loading="lazy" data-speed="0.055" data-limit="0.07" />
        </Reveal>
      </div>
    </section>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  const [introDone, setIntroDone] = useState(() => { try { return sessionStorage.getItem('fixzy:intro') === '1'; } catch { return false; } });
  useParallax();

  function scrollToServices() {
    document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      {!introDone && <Intro onDone={() => { try { sessionStorage.setItem('fixzy:intro', '1'); } catch { /* ignore */ } setIntroDone(true); }} />}
      <Header current="home" />
      <main id="main">
        <Hero query={query} onQueryChange={setQuery} onSearch={scrollToServices} ready={introDone} />
        <StatsStrip />
        <HowItWorks />
        <Marketplace />
        <Services query={query} />
      </main>
      <Footer />
    </>
  );
}
