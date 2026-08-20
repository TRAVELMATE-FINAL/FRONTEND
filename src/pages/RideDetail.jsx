import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Spinner from "../components/Spinner/Spinner.jsx";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import { formatTime12h } from "../utils/time.js";
import UserActions from "../components/UserActions/UserActions.jsx";
import RideMap from "../components/RideMap/RideMap";
import MapModal from "../components/RideMap/MapModal";
import { enforceSession } from "../services/session";
import ConfirmModal from "../components/ConfirmModal/ConfirmModal";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

/* ─────────────────────────────────────────────────────────
   Inline icon set — kept identical to the design template
   the user uploaded so nothing visually shifts.
───────────────────────────────────────────────────────── */
const MoreIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="5" r="1.5" fill="#9ca3af" />
    <circle cx="10" cy="10" r="1.5" fill="#9ca3af" />
    <circle cx="10" cy="15" r="1.5" fill="#9ca3af" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="#6b7280" strokeWidth="1.2" />
    <path d="M1.5 6h13" stroke="#6b7280" strokeWidth="1.2" />
    <path d="M5 1.5v2M11 1.5v2" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const PersonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="#6b7280" strokeWidth="1.2" />
    <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="#ef4444" strokeWidth="1.2" />
    <path d="M8 5v3.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="11" r="0.8" fill="#ef4444" />
  </svg>
);
const BlueDot = () => (
  <div style={{
    width: 12, height: 12, borderRadius: "50%",
    background: "#3b82f6", border: "2px solid #fff",
    boxShadow: "0 0 0 2px #3b82f6", flexShrink: 0,
  }} />
);
const GreenDot = () => (
  <div style={{
    width: 12, height: 12, borderRadius: "50%",
    background: "#22c55e", border: "2px solid #fff",
    boxShadow: "0 0 0 2px #22c55e", flexShrink: 0,
  }} />
);

/* "YYYY-MM-DD" + "HH:MM" → "Today, 3:00 PM" / "Tomorrow, 8:30 AM" / "5 May, 11:00 AM" */
function formatDateTime(date, time) {
  if (!date && !time) return "—";
  const t = formatTime12h(time);
  if (!date) return t;
  const d = new Date(date);
  if (isNaN(d.getTime())) return `${date} ${t}`;

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
  if (sameDay)    return `Today, ${t}`;
  if (isTomorrow) return `Tomorrow, ${t}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${t}`;
}

export default function RideDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Prefer ?rideId=… in the URL, else fall back to whatever the user
  // most-recently published or unlocked.
  const rideId =
    searchParams.get("rideId") ||
    localStorage.getItem("lastPostedRideId") ||
    localStorage.getItem("pendingUnlockRideId") ||
    "";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Whether the *viewer* (current logged-in user) has paid — only
  // then do we reveal the full driver phone. Default false until the
  // subscription endpoint confirms an active plan.
  const [hasPaid, setHasPaid] = useState(false);

  // Request-to-ride state: this viewer's request for this ride (if any).
  const [myReq, setMyReq] = useState(null);
  const [reqBusy, setReqBusy] = useState(false);
  const [reqMsg, setReqMsg] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  // Find Ride Daily plan price (admin-configured) — shown on Pay Now + in the
  // payment confirmation popup. Never hardcoded.
  const [findDailyPrice, setFindDailyPrice] = useState(null);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [reqSentOpen, setReqSentOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/plans/find-fee`, { timeout: 6000 })
      .then(({ data }) => {
        if (cancelled) return;
        if (Number.isFinite(Number(data?.dailyPrice))) setFindDailyPrice(Number(data.dailyPrice));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load the viewer's existing request for this ride (status + revealed contact).
  useEffect(() => {
    const ph = (() => { try { return localStorage.getItem("phone") || ""; } catch { return ""; } })();
    if (!rideId || !ph) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/rides/requests/outgoing`, { params: { phone: ph } })
      .then(({ data }) => {
        if (cancelled) return;
        const mine = (data?.data || []).find((r) => r.ride && String(r.ride._id) === String(rideId));
        setMyReq(mine || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [rideId]);

  const sendRequest = async () => {
    const ph = (() => { try { return localStorage.getItem("phone") || ""; } catch { return ""; } })();
    if (!ph) { navigate("/login"); return; }
    setReqBusy(true); setReqMsg("");
    try {
      await axios.post(`${API_BASE}/api/rides/${rideId}/request`, { riderPhone: ph });
      setMyReq({ status: "pending" });
      setReqSentOpen(true);
    } catch (e) {
      if (e.response?.status === 409) { setMyReq({ status: "pending" }); }
      else { setReqMsg(e.response?.data?.message || "Could not send request. Please try again."); }
    } finally {
      setReqBusy(false);
    }
  };

  // Pay Now — for a CONFIRMED (accepted) booking. Hands off to the EXISTING
  // find-ride plan / payment page (no new payment UI), which then continues
  // the existing flow back to the ride details page. Seat availability does
  // NOT gate this — the rider already holds a confirmed seat.
  //
  // Auth is preserved: if the session is missing/expired we stash the ride and
  // route through Login, returning here (?pay=1) afterward — no re-search, no
  // duplicate booking, and no profile-completion gate.
  const payNow = () => {
    const ph = enforceSession();
    if (!ph) {
      try {
        localStorage.setItem("pendingPayRideId", rideId);
        if (myReq?._id) localStorage.setItem("pendingPayBookingId", String(myReq._id));
      } catch (_e) {}
      navigate("/login");
      return;
    }
    // Breadcrumb the existing plan/payment pages already read.
    try { localStorage.setItem("pendingUnlockRideId", rideId); } catch (_e) {}
    navigate(`/findrideplan?rideId=${rideId}`);
  };

  // Auto-resume payment: if we arrived with ?pay=1 (from the ride card's PAY
  // NOW, or returning here after Login), and the viewer's booking is confirmed
  // but not yet paid, open the payment window automatically — once.
  const autoPayTriggered = useRef(false);
  useEffect(() => {
    if (autoPayTriggered.current) return;
    const wantPay = searchParams.get("pay") === "1";
    if (!wantPay) return;
    if (myReq?.status === "accepted" && myReq?.paymentStatus !== "paid") {
      autoPayTriggered.current = true;
      payNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myReq, searchParams]);

  useEffect(() => {
    if (!rideId) {
      setLoading(false);
      setError("Nothing selected — open a trip from the Find list.");
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");

    const safetyTimer = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
      setError((cur) => cur || "Backend is taking too long to respond. Please try again.");
    }, 10000);

    axios
      .get(`${API_BASE}/api/rides/${rideId}/details`, {
        timeout: 8000,
        signal: ctrl.signal,
      })
      .then(({ data: resp }) => {
        if (cancelled) return;
        setData(resp?.data || null);
      })
      .catch((err) => {
        if (cancelled || axios.isCancel(err)) return;
        const isTimeout = err?.code === "ECONNABORTED" || err?.message?.includes("timeout");
        const isNetDown = err?.code === "ERR_NETWORK" || err?.message === "Network Error";
        setError(
          isTimeout
            ? `Server at ${API_BASE} is taking too long. Try again in 15s.`
            : isNetDown
            ? `Could not reach the backend at ${API_BASE}. Make sure the server is running.`
            : err?.response?.data?.message || "Could not load ride details."
        );
        console.error("[RideDetail] fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      });

    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(safetyTimer);
    };
  }, [rideId]);

  // Check whether the viewer has an active paid subscription — that's
  // what unlocks the contact number reveal. If they're the rider's
  // own ride (their phone matches the driver's phone) we always
  // reveal it without payment.
  //
  // Race-condition fix: when the user just finished payment in
  // UnlockContact / SecurePayment, the backend may not have flushed
  // the new Subscription doc to MongoDB by the time we hit /plans/me.
  // To dodge that, we (1) trust a localStorage `subEndDate` written
  // right after a successful Razorpay verify, and (2) retry the API
  // call once after 2.5s if the first response said "inactive".
  useEffect(() => {
    const phone =
      (typeof window !== "undefined" && localStorage.getItem("phone")) || "";
    if (!phone) {
      setHasPaid(false);
      return;
    }

    // ── 1. Instant local proof ────────────────────────────────────
    // If we wrote subEndDate when payment succeeded, and it's still
    // in the future, the contact is unlocked immediately while the
    // API call below resolves in the background.
    try {
      const end = localStorage.getItem("subEndDate");
      if (end && new Date(end).getTime() > Date.now()) {
        setHasPaid(true);
      }
    } catch (_e) {}

    let cancelled = false;
    const checkSubscription = (attempt = 0) =>
      axios
        .get(`${API_BASE}/api/plans/me`, { params: { phone }, timeout: 6000 })
        .then(({ data: resp }) => {
          if (cancelled) return;
          const status = resp?.subscription?.status;
          const isActive = status === "active";
          if (isActive) {
            setHasPaid(true);
            // Refresh the local proof so future page loads stay unlocked
            // without waiting on the API.
            try {
              if (resp?.subscription?.endDate) {
                localStorage.setItem("subEndDate", resp.subscription.endDate);
              }
            } catch (_e) {}
          } else if (attempt === 0) {
            // First attempt said inactive — wait 2.5s and retry once
            // in case Mongo just hadn't committed yet.
            setTimeout(() => { if (!cancelled) checkSubscription(1); }, 2500);
          }
          // Note: don't flip hasPaid to false if local proof says true —
          // the user clearly just paid; let the next page load reconcile.
        })
        .catch(() => {
          // Network error — leave hasPaid as whatever local proof said.
        });
    checkSubscription();

    return () => { cancelled = true; };
  }, [rideId]);

  // Once the viewer has unlocked the contact (active subscription), record
  // the unlock as a booking so it appears in the admin panel. Fires at most
  // once per ride per page session; the backend upserts so repeats are safe.
  const [bookingLogged, setBookingLogged] = useState(false);
  useEffect(() => {
    if (!hasPaid || bookingLogged || !rideId) return;
    const phone =
      (typeof window !== "undefined" && localStorage.getItem("phone")) || "";
    if (!phone) return;
    setBookingLogged(true);
    axios
      .post(`${API_BASE}/api/rides/${rideId}/unlock`, { riderPhone: phone }, { timeout: 6000 })
      .catch(() => { /* non-fatal — booking is a side effect, never block the UI */ });
  }, [hasPaid, bookingLogged, rideId]);

  const ride = data?.ride;
  const driver = data?.driver;

  // ── Contact-number gate ──────────────────────────────────────
  // Reveal the full phone when ANY of these are true:
  //   1. The viewer has an active subscription (hasPaid)
  //   2. The viewer IS the driver (looking at their own ride)
  // Otherwise show the masked phone + Unlock Contact CTA.
  const viewerPhone =
    (typeof window !== "undefined" && localStorage.getItem("phone")) || "";
  const isOwnRide = (() => {
    if (!driver?.phone || !viewerPhone) return false;
    const onlyDigits = (s) => String(s).replace(/\D/g, "").slice(-10);
    return onlyDigits(driver.phone) === onlyDigits(viewerPhone);
  })();
  const contactUnlocked = hasPaid || isOwnRide;

  // Friendly fallbacks for every text field — never render raw "—" in
  // a UI that's supposed to look populated.
  const driverName  = driver?.fullName?.trim() || "TravelMate Rider";
  const initial     = driverName.charAt(0).toUpperCase();
  const vehicleType = (ride?.vehicle || "").toLowerCase() === "car" ? "Car" : "Bike";
  // Seat availability is driven by CONFIRMED (accepted) requests on the
  // backend. `remainingSeats` = totalSeats − confirmedSeats. Fall back to the
  // raw seatsAvailable for older API payloads that don't send remainingSeats.
  const totalSeats  = typeof ride?.seatsAvailable === "number" ? ride.seatsAvailable : 0;
  const seats       = typeof ride?.remainingSeats === "number" ? ride.remainingSeats : totalSeats;
  const rideFull    = typeof ride?.isFull === "boolean" ? ride.isFull : seats <= 0;
  const seatsLabel  = rideFull
    ? "No seats available"
    : `${seats} ${seats === 1 ? "seat" : "seats"} available`;
  // Only show the real number once the viewer has paid (or is the
  // ride's own poster). Otherwise show the masked version so the
  // last few digits are visible but the full number stays locked.
  const contactNum  = contactUnlocked
    ? (driver?.phone || driver?.maskedPhone || "—")
    : (driver?.maskedPhone || "•••• •••• ••");

  return (
    <div
      className="ride-detail-page"
      style={{
        background: "#f3f4f6",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />

      {/* Loading / error states */}
      {loading && (
        <div style={{ flex: 1, padding: "60px 20px" }}>
          <Spinner label="Loading details…" sublabel="Fetching driver info & route" />
        </div>
      )}

      {!loading && error && (
        <div style={{ flex: 1, maxWidth: 720, margin: "32px auto", padding: 16, width: "100%" }}>
          <div style={{
            background: "#fff5f5", border: "1px solid #fecaca",
            color: "#dc2626", borderRadius: 12, padding: 16, textAlign: "center",
          }}>
            {error}
          </div>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button
              onClick={() => navigate("/find-friend")}
              style={{
                background: "#7c3aed", color: "#fff", border: "none",
                borderRadius: 10, padding: "12px 22px", fontWeight: 700,
                fontSize: 14, cursor: "pointer",
              }}
            >
              Back to Find
            </button>
          </div>
        </div>
      )}

      {/* ── Body — uses the design template the user uploaded ── */}
      {!loading && !error && ride && (
        <div
          className="ride-detail-grid"
          style={{
            flex: 1,
            maxWidth: 1100,
            margin: "0 auto",
            width: "100%",
            padding: "28px 24px",
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: 20,
            alignItems: "start",
            boxSizing: "border-box",
          }}
        >

          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Driver Profile Card */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}>
              {/* Avatar — real photo if present, otherwise an initial-on-gradient tile */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 14,
                  background: driver?.photo
                    ? "transparent"
                    : "linear-gradient(135deg, #c7d2fe 0%, #a5b4fc 100%)",
                  overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#1e1b4b", fontSize: 30, fontWeight: 800,
                }}>
                  {driver?.photo
                    ? <img src={driver.photo} alt={driverName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initial}
                </div>
                <div style={{
                  position: "absolute", bottom: 4, right: 4,
                  width: 12, height: 12, borderRadius: "50%",
                  background: "#22c55e", border: "2px solid #fff",
                }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
                  {driverName}
                </h2>
                {driver?.city && (
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "3px 0 0" }}>
                    📍 {driver.city}
                  </p>
                )}
              </div>

              {/* Badges */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{
                  background: "#ede9fe", color: "#7c3aed",
                  fontSize: 12, fontWeight: 600,
                  padding: "5px 12px", borderRadius: 20,
                  border: "1px solid #ddd6fe",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="#7c3aed" strokeWidth="1.2" />
                    <path d="M4 6.5l1.5 1.5L9 5" stroke="#7c3aed" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {ride.vehicleModel || vehicleType}
                </div>
                {driver?.stats?.totalPostedRides > 0 && (
                  <div style={{
                    background: "#fefce8", color: "#92400e",
                    fontSize: 12, fontWeight: 600,
                    padding: "5px 12px", borderRadius: 20,
                    border: "1px solid #fde68a",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    🚗 {driver.stats.totalPostedRides} {driver.stats.totalPostedRides === 1 ? "trip" : "trips"}
                  </div>
                )}
              </div>

              <UserActions
                targetPhone={driver?.phone || ""}
                targetName={driverName}
              />
            </div>

            {/* Vehicle Details Card */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: "24px",
            }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
                Vehicle Details
              </h2>

              {/* Row 1 */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                borderBottom: "1px solid #f3f4f6", paddingBottom: 18, marginBottom: 18,
                gap: 16,
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 5px" }}>Vehicle</p>
                  <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{ride.vehicleModel || "—"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 5px" }}>Color</p>
                  <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{ride.vehicleColor || "—"}</p>
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 5px" }}>Plate Number</p>
                  <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
                    {myReq?.paymentStatus === "paid" && myReq?.vehicle?.number
                      ? myReq.vehicle.number
                      : "🔒 Locked"}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 5px" }}>Type</p>
                  <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{vehicleType}</p>
                </div>
              </div>

              {/* Unlock hint — shown until the booking is paid. */}
              {myReq?.paymentStatus !== "paid" && (
                <div style={{ marginTop: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
                  <p style={{ fontSize: 12.5, color: "#92400e", margin: 0, lineHeight: 1.5 }}>
                    🔒 The plate number and contact details will be unlocked after your ride request is confirmed and the payment is completed.
                  </p>
                </div>
              )}
            </div>

            {/* Additional Information Card — shown only when the rider added a note */}
            {ride.additionalInfo && (
              <div style={{
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                padding: "20px 24px",
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 8px" }}>
                  Additional Information
                </p>
                <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
                  {ride.additionalInfo}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Time & Seats Card */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: "20px 22px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <CalendarIcon />
                <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>
                  {formatDateTime(ride.date, ride.time)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <PersonIcon />
                <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>{seatsLabel}</span>
              </div>

              {/* Contact / Request to Ride — contact is revealed only after
                  the ride owner ACCEPTS the request (no payment). */}
              {(() => {
                const rideStatus = ride?.status || "active";
                const rideClosed = rideStatus === "expired" || rideStatus === "closed";
                const box = (bg, border, children) => (
                  <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>{children}</div>
                );
                if (isOwnRide) {
                  return box("#f9fafb", "#e5e7eb", (
                    <div style={{ fontSize: 14, color: "#374151" }}>
                      This is your ride. Manage requests in{" "}
                      <span onClick={() => navigate("/requests")} style={{ color: "#7c3aed", fontWeight: 700, cursor: "pointer" }}>Ride Requests</span>.
                    </div>
                  ));
                }
                if (rideClosed) {
                  return box("#f3f4f6", "#e5e7eb", (
                    <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 600 }}>
                      This ride is {rideStatus === "closed" ? "closed" : "expired"} and no longer accepting requests.
                    </div>
                  ));
                }
                if (myReq?.status === "accepted") {
                  const paid = myReq.paymentStatus === "paid";
                  // Paid → booking finalized, contact revealed.
                  if (paid) {
                    return box("#f0fdf4", "#bbf7d0", (
                      <div>
                        <div style={{ fontSize: 13, color: "#15803d", fontWeight: 800, marginBottom: 6 }}>
                          ✅ Payment Completed
                        </div>
                        <a href={`tel:${myReq.owner?.phone || ""}`} style={{ fontSize: 20, fontWeight: 700, color: "#166534" }}>
                          {myReq.owner?.phone || "—"}
                        </a>
                      </div>
                    ));
                  }
                  // Confirmed but payment pending → Pay Now (NEVER "Ride Full").
                  return box("#eef2ff", "#c7d2fe", (
                    <div>
                      <div style={{ fontSize: 12, color: "#4338ca", fontWeight: 700, marginBottom: 2 }}>
                        Booking confirmed by the driver
                      </div>
                      <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 10 }}>
                        {myReq.paymentStatus === "failed"
                          ? "Your last payment didn't go through. Retry to finalize your booking and view the contact details."
                          : "Complete payment to finalize your booking and view the contact details."}
                      </div>
                      <button type="button" onClick={() => setPayConfirmOpen(true)} disabled={payBusy} style={{
                        width: "100%", background: "#f5c518", color: "#111", border: "none", borderRadius: 10,
                        padding: "12px 14px", fontWeight: 700, fontSize: 14,
                        cursor: payBusy ? "not-allowed" : "pointer", fontFamily: "inherit",
                        boxShadow: "0 4px 12px rgba(245,197,24,0.30)",
                      }}>
                        {payBusy
                          ? "Processing…"
                          : `${myReq.paymentStatus === "failed" ? "Retry Payment" : "Pay Now"}${findDailyPrice != null ? ` • ₹${findDailyPrice}` : ""}`}
                      </button>
                      {payMsg && <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>{payMsg}</div>}
                    </div>
                  ));
                }
                if (myReq?.status === "pending") {
                  return box("#fef9c3", "#fde68a", (
                    <div style={{ fontSize: 14, color: "#854d0e", fontWeight: 600 }}>
                      Request sent — waiting for the owner to confirm.{" "}
                      <span onClick={() => navigate("/requests")} style={{ color: "#7c3aed", fontWeight: 700, cursor: "pointer" }}>View</span>
                    </div>
                  ));
                }
                if (myReq?.status === "rejected") {
                  return box("#fee2e2", "#fecaca", (
                    <div style={{ fontSize: 14, color: "#991b1b", fontWeight: 600 }}>Your request was declined.</div>
                  ));
                }
                // No seats left (all confirmed) — disable the request button.
                if (rideFull) {
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <button type="button" disabled style={{
                        width: "100%", background: "#e5e7eb", color: "#6b7280", border: "none", borderRadius: 10,
                        padding: "12px 14px", fontWeight: 700, fontSize: 14, cursor: "not-allowed", fontFamily: "inherit",
                      }}>
                        Ride Full
                      </button>
                      <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                        All seats for this ride have been confirmed.
                      </div>
                    </div>
                  );
                }
                return (
                  <div style={{ marginBottom: 12 }}>
                    <button type="button" onClick={sendRequest} disabled={reqBusy} style={{
                      width: "100%", background: "#f5c518", color: "#111", border: "none", borderRadius: 10,
                      padding: "12px 14px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
                      boxShadow: "0 4px 12px rgba(245,197,24,0.30)",
                    }}>
                      {reqBusy ? "Sending…" : "Request to Join"}
                    </button>
                    {reqMsg && <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>{reqMsg}</div>}
                  </div>
                );
              })()}

              {/* Low-seat alert — surfaces only if 1–2 seats remain, and only
                  for viewers who don't already hold a confirmed booking. */}
              {seats > 0 && seats <= 2 && myReq?.status !== "accepted" && (
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <AlertIcon />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>
                    Only {seats} {seats === 1 ? "seat" : "seats"} left!
                  </span>
                </div>
              )}
            </div>

            {/* Ride Route Card */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e5e7eb",
              padding: "20px 22px",
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>
                Trip Route
              </p>

              {/* Map preview — tap to open the zoomable map. Only shown when
                  the ride has usable coordinates. */}
              {ride.fromLat != null && ride.fromLon != null &&
               ride.toLat != null && ride.toLon != null && (
                <div
                  onClick={() => setMapOpen(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setMapOpen(true); }}
                  title="Tap to enlarge & zoom"
                  style={{
                    position: "relative",
                    width: "100%", height: 180,
                    borderRadius: 12, overflow: "hidden",
                    border: "1px solid #e5e7eb", marginBottom: 18,
                    cursor: "pointer",
                  }}
                >
                  <RideMap ride={ride} />
                  <div style={{ position: "absolute", inset: 0 }} />
                  <div style={{
                    position: "absolute", bottom: 8, right: 8,
                    width: 28, height: 28, borderRadius: 8,
                    background: "rgba(15,18,38,0.82)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, pointerEvents: "none",
                  }} aria-hidden="true">⛶</div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Origin */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <BlueDot />
                    <div style={{
                      width: 2, height: 44, background: "#d1d5db",
                      margin: "4px 0", borderRadius: 2,
                    }} />
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 3px" }}>
                      {ride.from || "—"}
                    </p>
                    {ride.distance && (
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                        Distance: {ride.distance}
                      </p>
                    )}
                  </div>
                </div>

                {/* Destination */}
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <GreenDot />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 3px" }}>
                      {ride.to || "—"}
                    </p>
                    {ride.duration && (
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                        Duration: {ride.duration}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {ride && <MapModal ride={ride} open={mapOpen} onClose={() => setMapOpen(false)} />}

      {/* Pay Now confirmation — shown only after the driver has accepted. */}
      <ConfirmModal
        open={payConfirmOpen}
        title="Complete Your Ride Payment"
        message="Your ride request has been accepted."
        rows={[
          { label: "Plan", value: "Find Ride Daily" },
          { label: "Validity", value: "24 Hours" },
          { label: "Amount", value: findDailyPrice != null ? `₹${findDailyPrice}` : "—" },
        ]}
        note="After payment, the contact number and vehicle number will be unlocked."
        cancelLabel="Cancel"
        confirmLabel="Continue to Payment"
        busy={payBusy}
        onCancel={() => setPayConfirmOpen(false)}
        onConfirm={() => { setPayConfirmOpen(false); payNow(); }}
      />

      {/* Request-sent confirmation (professional acknowledgement popup). */}
      <ConfirmModal
        open={reqSentOpen}
        title="Ride request sent successfully"
        message="You will be able to access the contact details after the host accepts your request."
        hideCancel
        confirmLabel="OK"
        onCancel={() => setReqSentOpen(false)}
        onConfirm={() => setReqSentOpen(false)}
      />

      <Footer />
    </div>
  );
}
