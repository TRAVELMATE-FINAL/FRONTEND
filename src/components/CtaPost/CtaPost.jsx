import { useNavigate } from 'react-router-dom';
import './CtaPost.css';

/* Call-to-action band encouraging drivers to post a ride. Navigates to the
   existing /post-ride page — no new flow. */
function CtaPost() {
  const navigate = useNavigate();
  return (
    <section className="cta-post">
      <div className="container cta-post__inner">
        <div className="cta-post__text">
          <h2 className="cta-post__title">Driving somewhere? Post your ride.</h2>
          <p className="cta-post__subtitle">
            Share your empty seats, set your fare per seat and travel cost-effectively.
            It only takes a minute.
          </p>
        </div>
        <button type="button" className="cta-post__btn" onClick={() => navigate('/post-ride')}>
          Post Your Ride
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}

export default CtaPost;
