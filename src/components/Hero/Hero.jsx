import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ added
import './Hero.css';

function Hero() {
  const [mode, setMode] = useState('find');         // find | post
  const [vehicle, setVehicle] = useState('car');    // car | bike
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');

  const navigate = useNavigate(); // ✅ added

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

    // Build query string and navigate to FindFriends
    const params = new URLSearchParams({
      from: from.trim(),
      to: to.trim(),
    });
    if (date) params.set('date', date);
    navigate(`/find-friend?${params.toString()}`);
  };

  return (
    <section className="hero">
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
            onClick={() => navigate('/post-ride')} // ✅ changed: navigate instead of setMode
          >
            Post
          </button>
        </div>

        {/* search card */}
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
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 17h14M6 17a2 2 0 1 0 4 0M14 17a2 2 0 1 0 4 0M3 13l2-6h14l2 6M5 13h14v4H5z" />
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
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="6" cy="17" r="3" />
                <circle cx="18" cy="17" r="3" />
                <path d="M6 17l4-9h4l3 6M14 8l2-3h3" />
              </svg>
              <span>Bike</span>
            </button>
          </div>

          <div className="search-card__fields">
            <label className="field">
              <span className="field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="Departure city"
              />
            </label>

            <label className="field">
              <span className="field__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="To"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="Destination city"
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
                onChange={(e) => setDate(e.target.value)}
                aria-label="Travel date"
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
      </div>
    </section>
  );
}

export default Hero;
