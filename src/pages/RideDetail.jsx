import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Spinner from "../components/Spinner/Spinner.jsx";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import { formatTime12h } from "../utils/time.js";

const API_BASE = import.meta.env.VITE_APP_URL || "http://localhost:5000";

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

  useEffect(() => {
    if (!rideId) {
      setLoading(false);
      setError("No ride id in the URL — open a ride from the Find Friend list.");
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
  useEffect(() => {
    const phone =
      (typeof window !== "undefined" && localStorage.getItem("phone")) || "";
    if (!phone) {
      setHasPaid(false);
      return;
    }
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/plans/me`, {
        params: { phone },
        timeout: 6000,
      })
      .then(({ data: resp }) => {
        if (cancelled) return;
        const status = resp?.subscription?.status;
        setHasPaid(status === "active");
      })
      .catch(() => {
        if (!cancelled) setHasPaid(false);
      });
    return () => { cancelled = true; };
  }, [rideId]);

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
  const driverEmail = driver?.email?.trim() || "—";
  const initial     = driverName.charAt(0).toUpperCase();
  const vehicleType = (ride?.vehicle || "").toLowerCase() === "car" ? "Car" : "Bike";
  const seats       = typeof ride?.seatsAvailable === "number" ? ride.seatsAvailable : 0;
  const seatsLabel  = `${seats} ${seats === 1 ? "seat" : "seats"} available`;
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
          <Spinner label="Loading ride details…" sublabel="Fetching driver info & route" />
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
              Back to Find Friend
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
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{driverEmail}</p>
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
                    🚗 {driver.stats.totalPostedRides} {driver.stats.totalPostedRides === 1 ? "ride" : "rides"}
                  </div>
                )}
              </div>

              <button style={{
                background: "transparent", border: "none",
                cursor: "pointer", padding: 6, borderRadius: 8,
                display: "flex", alignItems: "center",
              }}>
                <MoreIcon />
              </button>
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
                  <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{ride.plateNumber || "—"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 5px" }}>Type</p>
                  <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{vehicleType}</p>
                </div>
              </div>
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

              {/* Contact Number — masked unless the viewer has paid
                  for an active subscription, or is the ride poster. */}
              <div style={{
                background: contactUnlocked ? "#f0fdf4" : "#f9fafb",
                border: "1px solid " + (contactUnlocked ? "#bbf7d0" : "#e5e7eb"),
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 12,
              }}>
                <p style={{
                  fontSize: 12,
                  color: contactUnlocked ? "#15803d" : "#9ca3af",
                  margin: "0 0 6px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  {contactUnlocked ? "🔓" : "🔒"} Contact Number
                </p>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "0.5px" }}>
                  {contactNum}
                </p>
                {!contactUnlocked && (
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.setItem("pendingUnlockRideId", rideId); } catch {}
                      navigate("/findrideplan");
                    }}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      background: "#f5c518",
                      color: "#111",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      boxShadow: "0 4px 12px rgba(245,197,24,0.30)",
                    }}
                  >
                    Pay to unlock contact →
                  </button>
                )}
              </div>

              {/* Low-seat alert — surfaces only if 1–2 seats remain */}
              {seats > 0 && seats <= 2 && (
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
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 20px" }}>
                Ride Route
              </p>

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

      <Footer />
    </div>
  );
}
