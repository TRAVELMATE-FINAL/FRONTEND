import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationSearch from '../LocationSearch/LocationSearch';
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
  // Coordinates of the selected place (for geographic/nearby search).
  // Cleared when the user edits the text so stale coords aren't sent.
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);

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
    // Pass the selected vehicle type so the backend filters Car vs Bike.
    if (vehicle) params.set('vehicle', vehicle);
    // Pass coordinates so the backend can do geographic/nearby matching.
    if (fromCoords) { params.set('fromLat', fromCoords.lat); params.set('fromLon', fromCoords.lon); }
    if (toCoords)   { params.set('toLat', toCoords.lat);     params.set('toLon', toCoords.lon); }
    navigate(`/find-friend?${params.toString()}`);
  };

  return (
    <section className="hero">
      {/* Decorative travel illustration band — original artwork (no external
          images). Sits behind the content and animates subtly. */}
      <div className="hero__art" aria-hidden="true">
        <svg className="hero__art-svg" viewBox="0 0 1440 360" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
          {/* soft sun glow */}
          <circle className="hero__art-sun" cx="1120" cy="120" r="90" />
          {/* layered mountains / hills */}
          <path className="hero__art-hill hero__art-hill--far"  d="M0 210 L 220 120 L 420 210 L 640 110 L 880 210 L 1120 130 L 1440 210 V360 H0 Z" />
          <path className="hero__art-hill hero__art-hill--back" d="M0 250 Q 240 160 480 230 T 960 210 T 1440 230 V360 H0 Z" />
          <path className="hero__art-hill hero__art-hill--mid"  d="M0 290 Q 300 225 620 278 T 1180 266 T 1440 286 V360 H0 Z" />
          {/* trees */}
          <g className="hero__art-trees">
            <path d="M120 286 l10 -26 l10 26 z" /><rect x="127" y="286" width="6" height="12" />
            <path d="M1320 278 l11 -28 l11 28 z" /><rect x="1327" y="278" width="6" height="13" />
            <path d="M980 292 l9 -22 l9 22 z" /><rect x="986" y="292" width="5" height="11" />
          </g>
          {/* city skyline */}
          <g className="hero__art-city">
            <rect x="150" y="226" width="26" height="80" rx="3" />
            <rect x="184" y="200" width="20" height="106" rx="3" />
            <rect x="212" y="238" width="30" height="68" rx="3" />
            <rect x="1180" y="214" width="24" height="92" rx="3" />
            <rect x="1210" y="192" width="18" height="114" rx="3" />
            <rect x="1234" y="232" width="28" height="74" rx="3" />
          </g>
          {/* road surface */}
          <path className="hero__art-road" d="M0 360 L 0 330 C 380 300, 560 352, 820 322 S 1240 288, 1440 330 L 1440 360 Z" />
          {/* dashed centre line on the road */}
          <path className="hero__art-route" d="M40 338 C 380 312, 560 352, 820 326 S 1240 300, 1420 336" />
          {/* moving carpool car along the route */}
          <g className="hero__art-car">
            <rect x="-28" y="-15" width="56" height="21" rx="8" />
            <rect x="-15" y="-26" width="32" height="15" rx="5" />
            <circle cx="-14" cy="8" r="6.5" className="hero__art-wheel" />
            <circle cx="15" cy="8" r="6.5" className="hero__art-wheel" />
          </g>
        </svg>
      </div>

      <div className="container hero__inner">
        <span className="hero__eyebrow">Carpool across your city</span>
        <h1 className="hero__title">Share the Ride. Split the Cost.</h1>
        <p className="hero__subtitle">Find a trusted carpool or post your own — pick your seats and stops, pay securely, and travel together.</p>

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

        {/* Prominent entries to the separate features (Bus Route + Live Rides). */}
        <div className="hero__feature-row">
          <button
            type="button"
            onClick={() => navigate('/bus-routes')}
            className="hero__busbtn"
          >
            <span className="hero__busbtn-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10" />
                <path d="M3 16h18" />
                <path d="M6 16v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2" />
                <path d="M20 16v2a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1v-2" />
                <path d="M4 10h16" />
                <circle cx="8" cy="13" r="0.6" fill="currentColor" />
                <circle cx="16" cy="13" r="0.6" fill="currentColor" />
              </svg>
            </span>
            <span className="hero__busbtn-text">
              Bus Route Finder
              <span className="hero__busbtn-sub">Search any Chennai-area bus by number</span>
            </span>
            <svg className="hero__busbtn-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
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
                onChange={(v) => { setFrom(v); setFromCoords(null); }}
                onSelect={(item) => { setFrom(item.display_name); setFromCoords({ lat: item.lat, lon: item.lon }); }}
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
                onChange={(v) => { setTo(v); setToCoords(null); }}
                onSelect={(item) => { setTo(item.display_name); setToCoords({ lat: item.lat, lon: item.lon }); }}
              />
            </label>

            <button type="submit" className="btn btn--primary search-card__submit">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <span>Find</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </section>
  );
}

export default Hero;
