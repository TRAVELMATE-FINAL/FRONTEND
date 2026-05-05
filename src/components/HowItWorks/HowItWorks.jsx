import './HowItWorks.css';

const STEPS = [
  {
    n: 1,
    color: 'step--pink',
    title: 'Post or Find a Ride',
    text: 'Search for available rides or post your own travel plans'
  },
  {
    n: 2,
    color: 'step--green',
    title: 'Unlock Contact Securely',
    text: 'Pay a small fee to get verified contact details'
  },
  {
    n: 3,
    color: 'step--blue',
    title: 'Travel Together',
    text: 'Connect with your travel buddy and enjoy the journey'
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
            <li key={step.n} className="step">
              <span className={`step__badge ${step.color}`} aria-hidden="true">
                {step.n}
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
