import InfoPage from '../components/InfoPage/InfoPage.jsx';

export default function Contact() {
  return (
    <InfoPage
      title="Contact Us"
      subtitle="We're here to help with bookings, rides and anything else."
    >
      <h2>Get in touch</h2>
      <p>
        Questions about a booking, posting a ride or your account? Reach out and our team
        will get back to you as soon as possible.
      </p>

      <div className="infocards">
        <div className="infocard">
          <span className="infocard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
          </span>
          <div>
            <h3>Email</h3>
            <p><a href="mailto:tescodigitals26@gmail.com">tescodigitals26@gmail.com</a></p>
          </div>
        </div>

        <div className="infocard">
          <span className="infocard__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2.1z" />
            </svg>
          </span>
          <div>
            <h3>Support hours</h3>
            <p>Monday to Saturday, 9:00 AM – 7:00 PM IST</p>
          </div>
        </div>
      </div>

      <h2>Feedback</h2>
      <p>
        Your feedback helps us improve Vooggly for every traveller. Tell us what's working,
        what isn't, and what you'd like to see next.
      </p>
    </InfoPage>
  );
}
