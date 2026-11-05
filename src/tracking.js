import { useEffect, useRef, useState } from 'react';

/* Live-tracking seam. Until the API streams real GPS, the professional's position is simulated along a route;
   swap `useTrip` for a poll of the booking's location endpoint and the pages keep working unchanged. */

export const DEMO_HOME = [9.9816, 76.2999]; // customer (bookings don't carry coordinates yet)
export const DEMO_PRO_START = [9.9425, 76.2615]; // professional, ~5 km away

const rad = (d) => (d * Math.PI) / 180;
export function km(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/* A gently bending line standing in for the road route. */
export function routeBetween(a, b, steps = 48) {
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const bend = Math.sin(t * Math.PI) * 0.12;
    return [a[0] + dLat * t - dLng * bend, a[1] + dLng * t + dLat * bend];
  });
}

const at = (path, t) => {
  const f = Math.min(Math.max(t, 0), 1) * (path.length - 1);
  const i = Math.min(Math.floor(f), path.length - 2);
  const k = f - i;
  return [path[i][0] + (path[i + 1][0] - path[i][0]) * k, path[i + 1][1] + (path[i + 1][1] - path[i][1]) * k];
};

/* Moves from `from` to `to` over `seconds` while `running`. Returns { path, pos, progress, etaMin, arrived }. */
export function useTrip(from, to, { running = true, seconds = 90 } = {}) {
  const [path] = useState(() => routeBetween(from, to));
  const [progress, setProgress] = useState(0);
  const start = useRef(null);
  useEffect(() => {
    if (!running) { start.current = null; return undefined; }
    start.current ??= performance.now() - progress * seconds * 1000;
    const id = setInterval(() => {
      const p = Math.min((performance.now() - start.current) / (seconds * 1000), 1);
      setProgress(p);
      if (p >= 1) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, seconds]);
  const totalMin = Math.max(2, Math.round((km(from, to) / 24) * 60)); // ~24 km/h city traffic
  return { path, pos: at(path, progress), progress, etaMin: Math.max(Math.ceil(totalMin * (1 - progress)), progress >= 1 ? 0 : 1), distanceKm: km(at(path, progress), to), arrived: progress >= 1 };
}

/* Sample jobs for the professional app until requests come from the API. */
export const demoRequests = [
  { id: 'REQ-4821', serviceId: 1, customer: 'Divya R.', address: 'Flat 4B, Marine Drive, Ernakulam', coords: [9.9816, 76.2999], distanceKm: 4.8, estimate: 650, day: 'Today', slot: '15:00', notes: 'Kitchen tap leaking under the sink.' },
  { id: 'REQ-4822', serviceId: 7, customer: 'Arun P.', address: 'House 21, Panampilly Nagar', coords: [9.9615, 76.2933], distanceKm: 3.1, estimate: 550, day: 'Today', slot: '17:00', notes: 'Washing machine not draining.' },
];
export const incomingRequest = { id: 'REQ-4823', serviceId: 2, customer: 'Nisha K.', address: '12/340 Kaloor, Kochi', coords: [9.9942, 76.3012], distanceKm: 6.2, estimate: 700, day: 'Tomorrow', slot: '09:00', notes: 'Fan regulator replacement and one new socket.' };
