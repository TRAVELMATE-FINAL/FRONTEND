import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner/Spinner.jsx";

/**
 * ConnectUnlock (legacy route: /connect-unlock)
 * -------------------------------------------------------------------------
 * A shared ride link (or any direct hit on this URL) must NEVER auto-open the
 * unlock-contact / payment page — opening a link is only an invitation to the
 * RIDE, not authorization to see contact details or pay.
 *
 * So this route now simply forwards to the gated Ride Details page, which
 * derives the correct action from REAL backend state:
 *   • no request      → "Request to Join"
 *   • pending         → "Request sent — waiting for the owner"
 *   • accepted+unpaid → "Pay Now" (with confirmation)
 *   • accepted+paid   → unlocked contact / vehicle
 *   • own ride        → manage requests
 *
 * The backend independently enforces that contact is only returned for an
 * accepted + paid request, so the URL alone can never grant access.
 */
export default function ConnectUnlock() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rideId = searchParams.get("rideId");

  useEffect(() => {
    navigate(rideId ? `/ride-detail?rideId=${rideId}` : "/find-ride", { replace: true });
  }, [rideId, navigate]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner label="Opening ride…" sublabel="Loading the trip details" />
    </div>
  );
}
