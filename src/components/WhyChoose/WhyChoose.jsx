import './WhyChoose.css';

const FEATURES = [
  {
    title: 'Verified Users',
    text: 'All users are verified with ID and phone',
    icon: (
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  },
  {
    title: 'Secure Payments',
    text: 'Safe and encrypted payment gateway',
    icon: (
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    )
  },
  {
    title: 'Safe Travel',
    text: '24/7 support and travel insurance',
    icon: (
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.2" />
        <circle cx="17" cy="9" r="2.6" />
        <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
        <path d="M14.5 19c0-2.4 2-4 4-4s2.5 1.6 2.5 4" />
      </svg>
    )
  }
];

function WhyChoose() {
  return (
    <section className="why-choose">
      <div className="container">
        <header className="why-choose__header">
          <h2 className="why-choose__title">Why Choose Travel Mate?</h2>
          <p className="why-choose__subtitle">Safe, secure, and reliable</p>
        </header>

        <ul className="features">
          {FEATURES.map((f) => (
            <li key={f.title} className="feature">
              <span className="feature__icon">{f.icon}</span>
              <h3 className="feature__title">{f.title}</h3>
              <p className="feature__text">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default WhyChoose;
