import InfoPage from '../components/InfoPage/InfoPage.jsx';

export default function Terms() {
  return (
    <InfoPage
      title="Terms & Conditions"
      subtitle="The rules for using Vooggly as a driver or passenger."
    >
      <p><em>This is a general summary. Please replace it with your finalised terms before launch.</em></p>

      <h2>Using Vooggly</h2>
      <p>
        Vooggly connects drivers and passengers for shared travel. You agree to provide
        accurate information, to use the platform lawfully, and to treat other members with
        respect.
      </p>

      <h2>Bookings & payments</h2>
      <p>
        Passengers book a ride by selecting their boarding and dropping points and seats,
        then paying securely. A booking is confirmed once the driver accepts the paid
        request. Driver contact and vehicle details are revealed only after confirmation.
      </p>

      <h2>Cancellations & refunds</h2>
      <p>
        If a driver does not respond in time, or declines a paid request, the payment is
        refunded automatically as described during booking. Refund handling follows the
        policy shown at the time of payment.
      </p>

      <h2>Responsibilities</h2>
      <p>
        Drivers are responsible for valid documentation and safe driving; passengers are
        responsible for being at the agreed boarding point on time. Vooggly facilitates the
        connection and payment but is not a transport operator.
      </p>

      <p className="infonote">
        Questions about these terms? Visit our <a href="/contact">Contact</a> page.
      </p>
    </InfoPage>
  );
}
