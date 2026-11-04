import { useNavigate } from 'react-router-dom';
import './PopularRoutes.css';

/* Suggested quick-search routes. These are NOT ride listings — each card simply
   runs the existing Find Ride search for that From → To pair, showing whatever
   rides currently exist (which may be none). No backend/data assumptions. */
const ROUTES = [
  { from: 'Chennai', to: 'Bengaluru' },
  { from: 'Chennai', to: 'Coimbatore' },
  { from: 'Chennai', to: 'Pondicherry' },
  { from: 'Chennai', to: 'Vellore' },
  { from: 'Coimbatore', to: 'Chennai' },
  { from: 'Bengaluru', to: 'Chennai' },
];

function PopularRoutes() {
  const navigate = useNavigate();
  const go = (from, to) =>
    navigate(`/find-friend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

  return (
    <section className="poproutes">
      <div className="container">
        <header className="poproutes__header">
          <h2 className="poproutes__title">Popular routes</h2>
          <p className="poproutes__subtitle">Tap a route to see available rides</p>
        </header>

        <div className="poproutes__grid">
          {ROUTES.map((r) => (
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
              <span className="poproute__cta">
                View rides
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PopularRoutes;
