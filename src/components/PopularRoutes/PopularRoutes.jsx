import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PopularRoutes.css';

const API_BASE = import.meta.env.VITE_APP_URL || 'https://travelmate-backend-dzpq.onrender.com';

/* RECENT RIDES
   Dynamic section built ONLY from real customer-posted rides. It fetches the
   live rides list, keeps those that are active AND still have seats (i.e.
   accepting bookings), groups them by route (start → destination) and shows
   each route with its count of available rides. Clicking a route opens Find
   Ride pre-filled. Re-fetches on focus so it reflects new / removed rides. */
function PopularRoutes() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/rides`, { timeout: 8000 })
      .then(({ data }) => {
        if (cancelled) return;
        const rides = Array.isArray(data?.data) ? data.data : [];
        // Only active rides that still have seats (accepting bookings).
        const bookable = rides.filter((r) => {
          const statusOk = !r.status || r.status === 'active';
          const seatsLeft =
            typeof r.remainingSeats === 'number'
              ? r.remainingSeats
              : typeof r.seatsAvailable === 'number'
              ? r.seatsAvailable
              : 0;
          const notFull = typeof r.isFull === 'boolean' ? !r.isFull : seatsLeft > 0;
          return statusOk && notFull && seatsLeft > 0 && r.from && r.to;
        });

        // Group by route (start → destination).
        const map = new Map();
        for (const r of bookable) {
          const from = String(r.from).trim();
          const to = String(r.to).trim();
          const key = `${from.toLowerCase()}||${to.toLowerCase()}`;
          const existing = map.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            map.set(key, { from, to, count: 1 });
          }
        }

        // Most rides first; cap at 6 cards.
        const list = [...map.values()].sort((a, b) => b.count - a.count).slice(0, 6);
        setRoutes(list);
        setFailed(false);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cleanup = load();
    // Auto-refresh when the user returns to the tab (new/removed rides).
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cleanup && cleanup();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  const go = (from, to) =>
    navigate(`/find-friend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

  // Hide the whole section only on hard failure (keep the homepage clean).
  if (failed) return null;

  return (
    <section className="poproutes">
      <div className="container">
        <header className="poproutes__header">
          <h2 className="poproutes__title">Recent rides</h2>
          <p className="poproutes__subtitle">Routes posted by riders — tap one to see available rides</p>
        </header>

        {loading ? (
          <div className="poproutes__grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="poproute poproute--skeleton" aria-hidden="true">
                <span className="poproute__skelbar" />
                <span className="poproute__skelpill" />
              </div>
            ))}
          </div>
        ) : routes.length === 0 ? (
          <div className="poproutes__empty">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 11l1.4-3.7A2 2 0 0 1 8.3 6h7.4a2 2 0 0 1 1.9 1.3L19 11" />
              <path d="M3 16h18M6 16v2M18 16v2M5 11h14a2 2 0 0 1 2 2v3H3v-3a2 2 0 0 1 2-2z" />
            </svg>
            <p>No rides are available right now. Be the first — post a ride and others can join you.</p>
          </div>
        ) : (
          <div className="poproutes__grid">
            {routes.map((r) => (
              <button
                type="button"
                key={`${r.from}-${r.to}`}
                className="poproute card-hoverable"
                onClick={() => go(r.from, r.to)}
              >
                <span className="poproute__pts">
                  <span className="poproute__city">{r.from}</span>
                  <svg className="poproute__arrow" width="18" height="18" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <span className="poproute__city">{r.to}</span>
                </span>
                <span className="poproute__meta">
                  <span className="poproute__count">
                    {r.count} {r.count === 1 ? 'ride' : 'rides'} available
                  </span>
                  <span className="poproute__cta">
                    View
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default PopularRoutes;
