import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationSearch from '../LocationSearch/LocationSearch';
import './Hero.css';

/* ─────────────────────────────────────────────────────────────────
   Decorative pink icons scattered across the hero — positions
   match the Figma reference. Each entry's `x` / `y` is the resting
   offset (in px) from the hero's centre. On mount they explode
   outward from dead-centre to their resting spot with a staggered
   cubic-bezier easing. Offsets scale down on smaller viewports via
   the --spread variable in Hero.css.
   ───────────────────────────────────────────────────────────────── */
const FLOATING_ICONS = [
  // ─── LEFT cluster ──────────────────────────────
  { type: 'bike',   x: -620, y: -200, size: 50, delay: 0.06 },  // upper-left bike
  { type: 'pop',    x: -700, y:  100, size: 52, delay: 0.10 },  // mid-left popper
  { type: 'car',    x: -500, y:  -40, size: 42, delay: 0.14 },  // left car
  { type: 'heart',  x: -540, y:  220, size: 44, delay: 0.18 },  // lower-left heart-C
  { type: 'people', x: -340, y:  120, size: 40, delay: 0.22 },  // centre-left people
  // ─── RIGHT cluster ─────────────────────────────
  { type: 'pop',    x:  680, y: -200, size: 52, delay: 0.08 },  // upper-right popper
  { type: 'heart',  x:  540, y: -100, size: 44, delay: 0.12 },  // right heart-C
  { type: 'bike',   x:  300, y:   40, size: 50, delay: 0.16 },  // centre-right bike
  { type: 'car',    x:  430, y:  150, size: 42, delay: 0.20 },  // mid-right car
  { type: 'people', x:  560, y:  240, size: 40, delay: 0.24 },  // lower-right people
];

/* Inline SVG icons — pink/magenta to match Figma. The colours and
   stroke widths are tuned to look like the floating decorations in
   the Figma file. */
function FloatIcon({ type, size }) {
  const fill   = '#e879c4';
  const stroke = '#ec4899';
  switch (type) {
    case 'bike':
      return (
        <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
          <g stroke={stroke} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22" cy="9" r="2.6" fill={fill} />
            <path d="M19 12 L20 19 L26 17 L28 23" />
            <path d="M22 12 L28 10" />
            <path d="M9 28 L 16 24 L 22 28 L 29 24" />
            <circle cx="9"  cy="29" r="4.4" />
            <circle cx="29" cy="29" r="4.4" />
          </g>
        </svg>
      );
    case 'car':
      return (
        <svg viewBox="0 0 40 32" width={size} height={size * 0.8} aria-hidden="true">
          <g stroke={stroke} strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round">
            <path d="M4 22 L 6 14 Q 8 11 12 11 L 28 11 Q 32 11 34 14 L 36 22 L 36 25 L 4 25 Z" />
            <line x1="10" y1="14" x2="30" y2="14" />
            <circle cx="12" cy="26" r="2.8" fill={fill} />
            <circle cx="28" cy="26" r="2.8" fill={fill} />
          </g>
        </svg>
      );
    case 'people':
      return (
        <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
          <g stroke={stroke} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="11" r="3.6" fill={fill} />
            <circle cx="24" cy="11" r="3.6" fill={fill} />
            <path d="M5 30 Q 5 19 12 19 Q 18 19 18 30" />
            <path d="M18 30 Q 18 19 24 19 Q 31 19 31 30" />
          </g>
        </svg>
      );
    case 'pop':
      return (
        <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 32 L 13 23 L 17 27 Z" />
            <path d="M13 23 L 22 13" stroke={stroke} strokeWidth="2.2" fill="none" />
            <circle cx="24" cy="8"  r="1.8" />
            <circle cx="30" cy="12" r="1.5" />
            <circle cx="20" cy="4"  r="1.4" />
            <circle cx="32" cy="20" r="1.6" />
            <path d="M27 16 L 29 14" stroke={stroke} strokeWidth="2.2" fill="none" />
            <path d="M25 22 L 27 20" stroke={stroke} strokeWidth="2.2" fill="none" />
          </g>
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true">
          <g stroke={stroke} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M28 7 Q 12 7 12 18 Q 12 30 28 30" />
            <path d="M18 17 Q 17 14.6 14.5 14.6 Q 12 14.6 12 17.4 Q 12 20.5 18 23.5 Q 24 20.5 24 17.4 Q 24 14.6 21.5 14.6 Q 19 14.6 18 17 Z" fill={fill} />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

function Hero({ mode: modeProp, onModeChange }) {
  // Controlled mode if parent provides one, else manage internally
  const [internalMode, setInternalMode] = useState('find');
  const mode = modeProp ?? internalMode;
  const setMode = (m) => {
    if (onModeChange) onModeChange(m);
    else setInternalMode(m);
  };

  const [vehicle, setVehicle] = useState('car');    // car | bike
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate
    if (!from.trim() || !to.trim()) {
      alert("Please enter both 'From' and 'To' locations");
      return;
    }
    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      alert("'From' and 'To' cannot be the same");
      return;
    }

    // Build query string and navigate to FindFriends.
    // IMPORTANT: only include `date` if the user actually picked one.
    // Forcing date=today here hides every ride the user posted for a
    // future day (the backend /api/rides/search does an exact date
    // match), which is why a freshly-posted ride didn't appear in
    // Find Ride. Leaving date out means the search returns ALL rides
    // matching the chosen From/To.
    const params = new URLSearchParams({
      from: from.trim(),
      to: to.trim(),
    });
    if (date) params.set('date', date);
    navigate(`/find-friend?${params.toString()}`);
  };

  return (
    <section className="hero">
      {/* Decorative pink icons that fan out from centre on mount.
          Each icon is a tiny inline SVG positioned by px-offset from
          centre — see FLOATING_ICONS at the top of this file. Lives
          BEHIND the title/search-card (z-index:0) and is clipped to
          the hero box via overflow:hidden so icons can't spill onto
          adjacent sections. pointer-events:none means clicks pass
          straight through to the search card. */}
      <div className="hero__icons-bg" aria-hidden="true">
        {FLOATING_ICONS.map((it, i) => (
          <span
            key={i}
            className={`hero__icon-wrap hero__icon-wrap--${it.type}`}
            style={{
              '--x': `${it.x}px`,
              '--y': `${it.y}px`,
              '--delay': `${it.delay}s`,
            }}
          >
            <span className="hero__icon">
              <FloatIcon type={it.type} size={it.size} />
            </span>
          </span>
        ))}
      </div>

      <div className="container hero__inner">
        <h1 className="hero__title">Travel Together. Save More.</h1>
        <p className="hero__subtitle">Find or share rides easily across cities</p>

        {/* mode toggle: Find | Post */}
        <div className="hero__toggle" role="tablist" aria-label="Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'find'}
            className={`hero__toggle-btn ${mode === 'find' ? 'hero__toggle-btn--active' : ''}`}
            onClick={() => setMode('find')}
          >
            Find
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'post'}
            className={`hero__toggle-btn ${mode === 'post' ? 'hero__toggle-btn--active' : ''}`}
            onClick={() => setMode('post')}
          >
            Post
          </button>
        </div>

        {/* Search card — only rendered in Find mode. When the user clicks
            Post, the search card hides so the embedded PostPage form
            below can take over (no duplicate From/To/Date fields). */}
        {mode === 'find' && (
        <form className="search-card" onSubmit={handleSubmit}>
          {/* vehicle pills: Car | Bike */}
          <div className="search-card__vehicle" role="tablist" aria-label="Vehicle">
            <button
              type="button"
              role="tab"
              aria-selected={vehicle === 'car'}
              className={`vehicle-pill ${vehicle === 'car' ? 'vehicle-pill--active' : ''}`}
              onClick={() => setVehicle('car')}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M5.5 11l1.4-3.7A2 2 0 0 1 8.78 6h6.44a2 2 0 0 1 1.88 1.3L18.5 11H19a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1a2 2 0 1 1-4 0H10a2 2 0 1 1-4 0H5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h.5zM7.34 11h9.32l-1-2.7a.6.6 0 0 0-.56-.3H8.9a.6.6 0 0 0-.56.3L7.34 11zM7.5 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
              </svg>
              <span>Car</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={vehicle === 'bike'}
              className={`vehicle-pill ${vehicle === 'bike' ? 'vehicle-pill--active' : ''}`}
              onClick={() => setVehicle('bike')}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M5.5 18a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm13 2a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14 6h3a1 1 0 0 1 0 2h-2.4l1.6 3.2 1.3 2A4.5 4.5 0 1 0 19.4 14h-1.66l-3-6L13.1 6H14zM11 9h-.74L9.2 11H7a4.5 4.5 0 1 0 1.4 1.55L9.94 10H12l-1-1z"/>
              </svg>
              <span>Bike</span>
            </button>
          </div>

          <div className="search-card__fields">
            <label className="field field--locsearch">
              <span className="field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <LocationSearch
                placeholder="From"
                value={from}
                onChange={setFrom}
                onSelect={(item) => setFrom(item.display_name)}
              />
            </label>

            <label className="field field--locsearch">
              <span className="field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <LocationSearch
                placeholder="To"
                value={to}
                onChange={setTo}
                onSelect={(item) => setTo(item.display_name)}
              />
            </label>

            <label className="field">
              <span className="field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </span>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Travel date"
                data-has-value={date ? "true" : "false"}
              />
            </label>

            <button type="submit" className="btn btn--primary search-card__submit">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <span>Find Ride</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </section>
  );
}

export default Hero;
