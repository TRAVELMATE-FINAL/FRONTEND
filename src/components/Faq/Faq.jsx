import { useState } from 'react';
import './Faq.css';

/* Genuine FAQs about how the platform actually works. */
const FAQS = [
  {
    q: 'How does Vooggly work?',
    a: 'Drivers post a ride with their route, date, time, available seats and a fare per seat. Passengers search by their starting point and destination — including rides that pass through intermediate stops — pick their boarding and dropping points, book securely and travel together.',
  },
  {
    q: 'Is my payment secure?',
    a: 'Yes. Payments are processed through a secure, encrypted payment gateway. Your card details are never stored on Vooggly.',
  },
  {
    q: 'When do I get the driver’s contact and vehicle details?',
    a: 'Driver name, contact number and vehicle details are shared only after your booking is confirmed and paid. Before that, personal details stay private.',
  },
  {
    q: 'Can I choose where I’m picked up and dropped off?',
    a: 'Yes. When booking you can select your boarding and dropping points along the driver’s route, in the correct order, and choose how many seats you need.',
  },
  {
    q: 'What happens if the driver doesn’t accept my request?',
    a: 'If the driver rejects your request or doesn’t respond within the time window, your payment is refunded automatically — you don’t need to do anything.',
  },
  {
    q: 'How do I post a ride as a driver?',
    a: 'Tap Post, enter your start, destination, date, time, vehicle details, available seats, fare per seat and any intermediate stops, then publish. Passengers can then find and request your ride.',
  },
];

function FaqItem({ item, open, onToggle, id }) {
  return (
    <div className={`faq__item ${open ? 'faq__item--open' : ''}`}>
      <button
        type="button"
        className="faq__q"
        aria-expanded={open}
        aria-controls={`faq-a-${id}`}
        onClick={onToggle}
      >
        <span>{item.q}</span>
        <svg className="faq__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div id={`faq-a-${id}`} className="faq__a" role="region">
        <p>{item.a}</p>
      </div>
    </div>
  );
}

function Faq() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section className="faq">
      <div className="container">
        <header className="faq__header">
          <h2 className="faq__title">Frequently asked questions</h2>
          <p className="faq__subtitle">Everything you need to know about riding and posting on Vooggly</p>
        </header>

        <div className="faq__list">
          {FAQS.map((item, i) => (
            <FaqItem
              key={i}
              id={i}
              item={item}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Faq;
