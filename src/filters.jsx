import { useCallback, useId, useState } from 'react';
import { actions, useStore } from './store.js';

/* Filter state mirrored into the URL query string so any filtered view can be shared or reloaded. */
export function useQueryState(defaults) {
  const read = () => {
    const p = new URLSearchParams(window.location.search);
    return Object.fromEntries(Object.entries(defaults).map(([k, d]) => [k, p.get(k) ?? d]));
  };
  const [values, setValues] = useState(read);
  const write = useCallback((next) => {
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v !== '' && v !== defaults[k]) p.set(k, v); });
    const qs = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [defaults]);
  const set = (patch) => setValues((v) => { const next = { ...v, ...patch }; write(next); return next; });
  const reset = () => { setValues(defaults); write(defaults); };
  const active = Object.keys(defaults).filter((k) => values[k] !== defaults[k]).length;
  return [values, set, reset, active];
}

/* Search input with native suggestions and the visitor's recent searches. */
export function SearchBox({ id, label, placeholder, value, onChange, suggestions = [] }) {
  const listId = useId();
  const recent = useStore((s) => s.recent);
  const [focused, setFocused] = useState(false);
  const commit = () => { const q = value.trim(); if (q.length > 1) actions.addRecent(q); };
  return (
    <div className="search">
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <input
        id={id} type="search" placeholder={placeholder} autoComplete="off" list={listId} value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commit(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
      />
      <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      {focused && !value && recent.length > 0 && (
        <div className="recent" role="group" aria-label="Recent searches">
          <span>Recent</span>
          {recent.map((r) => <button key={r} type="button" className="chip" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(r)}>{r}</button>)}
        </div>
      )}
    </div>
  );
}

export function FilterSelect({ id, label, value, onChange, options }) {
  return (
    <div className="filter-select">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </div>
  );
}

export function ActiveFilters({ items, onReset }) {
  if (!items.length) return null;
  return (
    <div className="active-filters" aria-label="Active filters">
      {items.map(({ label, clear }) => (
        <button key={label} type="button" className="chip is-on" onClick={clear} aria-label={`Remove filter ${label}`}>{label} ×</button>
      ))}
      <button type="button" className="text-link" onClick={onReset}>Clear all</button>
    </div>
  );
}
