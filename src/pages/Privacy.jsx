import InfoPage from '../components/InfoPage/InfoPage.jsx';

export default function Privacy() {
  return (
    <InfoPage
      title="Privacy Policy"
      subtitle="How Vooggly collects, uses and protects your information."
    >
      <p><em>This is a general summary. Please replace it with your finalised legal policy before launch.</em></p>

      <h2>Information we collect</h2>
      <p>
        To provide the service we collect the details you give us — such as your name,
        phone number, city and the ride information you post or book. Payment is processed
        securely through our payment provider.
      </p>

      <h2>How we use it</h2>
      <p>
        We use your information to verify your account, match rides, process bookings and
        payments, and keep the platform safe. A driver's contact and vehicle details are
        shared with a passenger only after a booking is confirmed and paid.
      </p>

      <h2>What we don't do</h2>
      <p>
        We do not display your phone number, vehicle registration or other private details
        publicly, and we do not sell your personal information to third parties.
      </p>

      <h2>Your choices</h2>
      <p>
        You can review or update your profile at any time, and contact us to request
        changes to your data. For any privacy question, reach us via the{' '}
        <a href="/contact">Contact</a> page.
      </p>
    </InfoPage>
  );
}
