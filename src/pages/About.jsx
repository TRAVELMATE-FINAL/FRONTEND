import InfoPage from '../components/InfoPage/InfoPage.jsx';

export default function About() {
  return (
    <InfoPage
      title="About Vooggly"
      subtitle="Making everyday travel more affordable, social and sustainable."
    >
      <h2>Who we are</h2>
      <p>
        Vooggly is a ride-sharing platform that connects drivers with empty seats to
        passengers travelling the same way. Instead of everyone driving alone, we help
        people share the journey — splitting costs, reducing traffic and making travel
        friendlier.
      </p>

      <h2>What we do</h2>
      <p>
        Drivers post their trips with the route, date, departure time, available seats
        and a fare per seat. Passengers search by their starting point and destination —
        including rides that pass through intermediate stops — choose where they board and
        get off, book securely and travel together.
      </p>

      <h2>Why it matters</h2>
      <p>
        Shared travel means lower costs for everyone, fewer vehicles on the road and a
        smaller environmental footprint. With secure booking and payment, and driver
        details shared only after confirmation, Vooggly keeps the experience simple and
        trustworthy.
      </p>

      <p className="infonote">
        Have a question or suggestion? We'd love to hear from you — visit our{' '}
        <a href="/contact">Contact</a> page.
      </p>
    </InfoPage>
  );
}
