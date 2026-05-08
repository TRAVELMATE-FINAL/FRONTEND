import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__col">
            <h4 className="footer__heading">Friend Travel</h4>
            <p className="footer__text">
              Share rides, save money, and travel together across India.
            </p>
          </div>

          <div className="footer__col">
            <h4 className="footer__heading">Quick Links</h4>
            <ul className="footer__list">
              <li><a href="#find-ride">Find Ride</a></li>
              <li><a href="#post-ride">Post Ride</a></li>
              <li><a href="#my-trips">My Trips</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__heading">Support</h4>
            <ul className="footer__list">
              <li><a href="#help">Help Center</a></li>
              <li><a href="#safety">Safety</a></li>
              <li><a href="#terms">Terms</a></li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__heading">Connect</h4>
            <ul className="footer__social" aria-label="Social links">
              <li>
                <a href="#facebook" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.3-1.5 1.6-1.5h1.7V4.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V11H7.5v3.1h2.9V22h3.1z" />
                  </svg>
                </a>
              </li>
              <li>
                <a href="#twitter" aria-label="Twitter">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 12 9.1c-3.4-.2-6.4-1.8-8.5-4.3-.4.6-.6 1.4-.6 2.2 0 1.4.7 2.7 1.9 3.4-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.7 3.3 4.1-.4.1-.8.2-1.2.2-.3 0-.6 0-.9-.1.6 1.7 2.2 2.9 4.1 3-1.5 1.2-3.4 1.9-5.5 1.9H2c2 1.3 4.4 2 6.9 2 8.3 0 12.8-6.9 12.8-12.8v-.6c.9-.6 1.6-1.4 2.3-2.2z" />
                  </svg>
                </a>
              </li>
              <li>
                <a href="#instagram" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </li>
              <li>
                <a href="#email" aria-label="Email">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© 2026 Friend Travel. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
