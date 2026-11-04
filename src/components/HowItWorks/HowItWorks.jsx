import './HowItWorks.css';

const STEPS = [
  {
    n: 1,
    color: 'step--pink',
    title: 'Search for a Ride',
    text: 'Find rides based on your starting point, destination and date.',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    )
  },
  {
    n: 2,
    color: 'step--green',
    title: 'Choose Your Ride',
    text: 'Select a suitable ride and your boarding / drop-off points.',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    )
  },
  {
    n: 3,
    color: 'step--blue',
    title: 'Book and Travel',
    text: 'Complete payment, confirm your booking and get driver & vehicle details.',
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    )
  }
];

function HowItWorks() {
  return (
    <section className="how-it-works">
      <div className="container">
        <header className="how-it-works__header">
          <h2 className="how-it-works__title">How It Works</h2>
          <p className="how-it-works__subtitle">Three simple steps to your next journey</p>
        </header>

        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.n} className="step card-hoverable">
              <span className={`step__icon ${step.color}`} aria-hidden="true">
                {step.icon}
                <span className="step__num">{step.n}</span>
              </span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
