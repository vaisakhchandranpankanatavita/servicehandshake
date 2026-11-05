import { useEffect, useState } from 'react';
import { seedReviews } from './data.js';
import { Icon } from './shared.jsx';
import { actions, useStore } from './store.js';
import { useToast } from './ui.jsx';

/* Reviews, ratings and wishlist hearts shared across product, orders and service pages. */

export const Stars = ({ value, label = true }) => (
  <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
    {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < Math.round(value) ? 'on' : ''}><Icon name="star" size={14} /></span>)}
    {label && <b>{Number(value).toFixed(1)}</b>}
  </span>
);

export const Avatar = ({ name }) => (
  <span className="avatar" aria-hidden="true">{name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
);

export function HeartButton({ id, name }) {
  const saved = useStore((s) => s.wishlist.includes(id));
  const toast = useToast();
  return (
    <button
      type="button" className={`heart${saved ? ' is-on' : ''}`} aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from saved items` : `Save ${name}`}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        actions.toggleWishlist(id).catch((err) => toast(err.message, { tone: 'error' }));
        toast(saved ? 'Removed from saved items' : 'Saved for later');
      }}
    >
      <Icon name="heart" size={18} />
    </button>
  );
}

export function useReviews(kind, target) {
  const real = useStore((s) => s.reviewsByKey[`${kind}:${target}`]);
  useEffect(() => { actions.loadReviews(kind, target).catch(() => {}); }, [kind, target]);
  const samples = seedReviews.filter((r) => r.kind === kind && r.target === target).map((r) => ({ ...r, sample: true }));
  return [...(real || []), ...samples].sort((a, b) => b.at - a.at);
}

export function ReviewForm({ kind, target, label, bookingId, onDone }) {
  const user = useStore((s) => s.user);
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  if (!user) return <p className="muted"><a className="text-link" href={`/login?redirect=${kind === 'product' ? 'shop' : 'orders'}`}>Sign in</a> to leave a review.</p>;
  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { toast('Pick a star rating first', { tone: 'error' }); return; }
    try {
      await actions.addReview({ kind, target, bookingId, rating, text: text.trim() });
    } catch (err) {
      toast(err.message, { tone: 'error' });
      return;
    }
    toast('Thanks for your review', { tone: 'success' });
    setRating(0); setText(''); onDone?.();
  };
  return (
    <form className="review-form" onSubmit={submit}>
      <fieldset>
        <legend>{label || 'Your rating'}</legend>
        <div className="rate" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-pressed={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}><Icon name="star" size={22} /></button>
          ))}
        </div>
      </fieldset>
      <div className="field"><label htmlFor={`rv-${kind}-${target}`}>Comment (optional)</label><textarea id={`rv-${kind}-${target}`} rows="3" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} /></div>
      <button className="pill pill-small" type="submit">Post review</button>
    </form>
  );
}

export function Reviews({ kind, target, form = true }) {
  const list = useReviews(kind, target);
  const avg = list.length ? list.reduce((n, r) => n + r.rating, 0) / list.length : 0;
  return (
    <section className="reviews" aria-labelledby={`rv-h-${kind}-${target}`}>
      <h2 className="h2" id={`rv-h-${kind}-${target}`}>Reviews</h2>
      {list.length > 0 ? <p className="rv-sum"><Stars value={avg} /> <span>{list.length} review{list.length > 1 ? 's' : ''}</span></p> : <p className="muted">No reviews yet. Be the first.</p>}
      <ul className="rv-list">
        {list.map((r) => (
          <li key={r.id}><Avatar name={r.name} /><div><b>{r.name}</b> <Stars value={r.rating} label={false} />{r.text && <p>{r.text}</p>}</div></li>
        ))}
      </ul>
      {list.some((r) => r.sample) && <p className="muted">Includes sample reviews shown until real ones arrive.</p>}
      {form && <ReviewForm kind={kind} target={target} />}
    </section>
  );
}
