import './WhyChoose.css';

const FEATURES = [
  {
    title: 'Easy Ride Booking',
    text: 'Find a ride and book your seat in just a few taps.',
    icon: (
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
        <path d="M8.5 14l2 2 4-4" />
      </svg>
    )
  },
  {
    title: 'Multiple Boarding & Drop-off',
    text: 'Choose exactly where you get on and off along the route.',
    icon: (
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="6" cy="6" r="2.2" />
        <circle cx="18" cy="18" r="2.2" />
        <path d="M6 8.2v4.3a3.5 3.5 0 0 0 3.5 3.5H15" />
        <path d="M13 13.5l2 2.2-2 2.3" />
      </svg>
    )
  },
  {
    title: 'Affordable Shared Travel',
    text: 'Split travel costs with co-passengers and save on every trip.',
    icon: (
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M14.5 9.2c-.6-.8-1.6-1.2-2.6-1.2-1.7 0-2.8.9-2.8 2.1 0 3 5.6 1.4 5.6 4.3 0 1.3-1.2 2.2-2.9 2.2-1.1 0-2.2-.5-2.8-1.3" />
        <path d="M12 6.4v1.6M12 16v1.6" />
      </svg>
    )
  },
  {
    title: 'Simple Ride Posting',
    text: 'Drivers can post a ride with seats, fare and stops in minutes.',
    icon: (
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  },
  {
    title: 'Convenient Route Search',
    text: 'Match rides by your start, destination — even intermediate stops.',
    icon: (
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    )
  },
  {
    title: 'Secure Booking & Payment',
    text: 'Pay safely online — driver contact is shared only after payment.',
    icon: (
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  }
];

function WhyChoose() {
  return (
    <section className="why-choose">
      <div className="container">
        <header className="why-choose__header">
          <h2 className="why-choose__title">Why Choose Vooggly?</h2>
          <p className="why-choose__subtitle">Everything you need for easy, affordable shared travel</p>
        </header>

        <ul className="features">
          {FEATURES.map((f) => (
            <li key={f.title} className="feature card-hoverable">
              <span className="feature__icon">{f.icon}</span>
              <div className="feature__body">
                <h3 className="feature__title">{f.title}</h3>
                <p className="feature__text">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default WhyChoose;
