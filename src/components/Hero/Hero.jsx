import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationSearch from '../LocationSearch/LocationSearch';
import FloatingIconsBg from '../FloatingIconsBg/FloatingIconsBg';
import './Hero.css';

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
      {/* Shared decorative-icons layer — same component used on
          /find-friend so the Figma look is consistent across pages. */}
      <FloatingIconsBg />

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
