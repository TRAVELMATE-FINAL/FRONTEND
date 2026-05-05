import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <a href="/" className="header__brand" aria-label="Travel Mate home">
          <span className="header__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <span className="header__name">Travel Mate</span>
        </a>

        <nav className="header__nav" aria-label="Primary">
          <button type="button" className="header__login">Login</button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
