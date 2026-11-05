import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pin = (kind, glyph) => L.divIcon({ className: '', html: `<span class="map-pin map-pin-${kind}">${glyph}</span>`, iconSize: [38, 38], iconAnchor: [19, 19] });
const ICON = { home: pin('home', '⌂'), pro: pin('pro', '➤') };

/* OpenStreetMap view with the customer's pin, an optional professional's pin that glides, and the route line. */
export function LiveMap({ home, pro, path, label }) {
  const el = useRef(null);
  const map = useRef(null);
  const proMarker = useRef(null);

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView(home, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(m);
    L.marker(home, { icon: ICON.home, keyboard: false }).addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; proMarker.current = null; };
  }, [home]);

  useEffect(() => {
    const m = map.current;
    if (!m || !path) return undefined;
    const line = L.polyline(path, { color: '#141412', weight: 4, opacity: 0.55, dashArray: '2 9', lineCap: 'round' }).addTo(m);
    m.fitBounds(line.getBounds(), { padding: [48, 48] });
    return () => { line.remove(); };
  }, [path, home]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!pro) { proMarker.current?.remove(); proMarker.current = null; return; }
    if (proMarker.current) proMarker.current.setLatLng(pro);
    else proMarker.current = L.marker(pro, { icon: ICON.pro, keyboard: false, zIndexOffset: 500 }).addTo(m);
    if (!m.getBounds().pad(-0.1).contains(pro)) m.panTo(pro);
  }, [pro, home, path]);

  return <div ref={el} className="live-map" role="img" aria-label={label} />;
}
