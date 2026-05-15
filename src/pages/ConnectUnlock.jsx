import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import Spinner from "../components/Spinner/Spinner.jsx";
import { formatTime12h } from "../utils/time.js";
import UserActions from "../components/UserActions/UserActions.jsx";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

/* "YYYY-MM-DD" + "HH:MM" → "Today, 3:00 PM" / "Tomorrow, 8:30 AM" / "5 May, 11:00 AM"
   Uses the shared 12-hour formatter so AM/PM rendering matches every other page. */
function formatDateTime(date, time) {
  if (!date && !time) return "—";
  const d = new Date(`${date}T${time || "00:00"}`);
  if (isNaN(d.getTime())) {
    return `${date || ""} ${formatTime12h(time)}`.trim();
  }

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

  const t = formatTime12h(time || `${d.getHours()}:${d.getMinutes()}`);
  if (sameDay)    return `Today, ${t}`;
  if (isTomorrow) return `Tomorrow, ${t}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${t}`;
}

export default function ConnectUnlock() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rideId = searchParams.get("rideId");

  const [ride, setRide] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [unlocked, setUnlocked]   = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [contact, setContact]     = useState("");

  // Fetch the ride + driver profile from backend
  useEffect(() => {
    if (!rideId) {
      setError("No ride selected. Open a ride from Find Friends to continue.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/api/rides/${rideId}/connect`);
        if (cancelled) return;
        setRide(data?.data?.ride || null);
        setUser(data?.data?.user || null);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || "Could not load ride details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rideId]);

  // Helper — strict "logged in" check. Phone must exist and be a +91 number
  // produced by the OTP-verify flow. Anything else routes through /login.
  const isLoggedIn = () => {
    const p = localStorage.getItem("phone") || "";
    return /^\+?\d{10,13}$/.test(p);
  };

  const sendToLogin = () => {
    localStorage.setItem("pendingUnlockRideId", rideId);
    navigate("/login");
  };

  // "Unlock Contact" — kick off the standard plan + payment chain.
  // The user lands here from FindFriends → /connect-unlock. Clicking
  // this button doesn't reveal the phone directly — it forces the
  // user through:
  //   • Not logged in    → /login → /otp → /profile-setup → /findrideplan
  //   • No profile yet   → /profile-setup → /findrideplan
  //   • Logged in + profile → /findrideplan directly
  //
  // /findrideplan → user picks "Go Daily" → /unlock-contact (payment)
  //   → on Razorpay success → /ride-detail (contact visible).
  const handleUnlock = async () => {
    if (!rideId) return;
    // Always stash the rideId so the chain (login → otp → profile-setup
    // → findrideplan → unlock-contact → ride-detail) can read it.
    try { localStorage.setItem("pendingUnlockRideId", rideId); } catch (e) {}

    // Step 1: not logged in → start the chain at /login
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    // Step 2: logged in — check profile completeness
    try {
      setUnlocking(true);
      const phone = localStorage.getItem("phone") || "";
      const r = await axios.get(
        `${API_BASE}/api/auth/profile?phone=${encodeURIComponent(phone)}`,
        { timeout: 6000 }
      );
      const u = r?.data?.user || r?.data || {};
      const hasProfile = !!(u.fullName && u.city);
      if (!hasProfile) {
        navigate("/profile-setup");
        return;
      }
    } catch (e) {
      // Profile check failed → route through login to re-auth safely
      try { localStorage.removeItem("phone"); } catch (_e) {}
      navigate("/login");
      return;
    } finally {
      setUnlocking(false);
    }

    // Step 3: logged in + profile complete → go to plan picker
    navigate(`/findrideplan?rideId=${rideId}`);
  };

  // ── derived values ──
  const driverName  = user?.fullName?.trim() || "TravelMate Rider";
  const driverPhoto = user?.driverPhoto || user?.photo || "";
  const initial     = driverName.charAt(0).toUpperCase();
  const fromCity    = ride?.from || "—";
  const toCity      = ride?.to   || "—";
  const fromSub     = user?.city ? `${user.city}` : "";
  const toSub       = "";
  const vehicleType  = ride?.vehicle      || "Bike";
  const vehicleModel = ride?.vehicleModel || (vehicleType === "Car" ? "Car" : "Bike");
  const vehicleColor = ride?.vehicleColor || "—";
  const seats        = typeof ride?.seatsAvailable === "number" ? ride.seatsAvailable : 1;
  const additional   = ride?.additionalInfo?.trim() || "No additional notes from the rider.";
  const dtLabel      = formatDateTime(ride?.date, ride?.time);
  const maskedPhone  = user?.maskedPhone || "Contact Number";

  return (
    <div className="cu-page-root" style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#e8eaef" }}>

      <Header />

      {/* Status banners */}
      {loading && (
        <Spinner label="Loading ride details..." sublabel="Fetching driver info & route" />
      )}
      {!loading && error && (
        <div style={{ margin: "40px auto", maxWidth: 520, padding: 24, background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 12, textAlign: "center" }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && ride && (
        <main style={{
          flex: 1,
          width: "100%",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "32px 24px 60px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 380px",
          gap: 22,
          alignItems: "start",
          boxSizing: "border-box",
        }} className="cu-grid">
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>

            {/* ── Card 1: Driver Header + Route ── */}
            <div style={{
              background: "#fff",
              borderRadius: 20,
              padding: "26px 28px",
              boxShadow: "0 2px 14px rgba(15, 15, 46, 0.06)",
              border: "1px solid #eef0f4",
            }}>
              {/* Driver row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: driverPhoto ? "#f3f4f6" : "#d63384",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, overflow: "hidden",
                }}>
                  {driverPhoto
                    ? <img src={driverPhoto} alt={driverName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontWeight: 800, fontSize: 24 }}>{initial}</span>}
                </div>

                <span style={{
                  fontWeight: 800, fontSize: 26, color: "#1a1a2e",
                  flex: 1, letterSpacing: "-0.4px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {driverName}
                </span>

                {/* Light-blue rating pill — matches Figma exactly */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#e7eefc",
                  borderRadius: 999, padding: "8px 16px",
                  flexShrink: 0,
                }}>
                  <span style={{ color: "#f59e0b", fontSize: 14 }}>★</span>
                  <span style={{ color: "#1a1a2e", fontWeight: 700, fontSize: 14 }}>4.8(43)</span>
                </div>

                <UserActions
                  targetPhone={user?.phone || ""}
                  targetName={driverName}
                />
              </div>

              {/* Route */}
              <div>
                <div style={{
                  fontSize: 18, fontWeight: 700, color: "#1a1a2e",
                  marginBottom: 16, letterSpacing: "-0.2px",
                }}>
                  Route
                </div>

                <div style={{ display: "flex", gap: 18 }}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    paddingTop: 6,
                  }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
                    <div style={{
                      width: 2, flex: 1, margin: "6px 0",
                      background: "repeating-linear-gradient(to bottom, #cbd5e1 0px, #cbd5e1 4px, transparent 4px, transparent 9px)",
                      minHeight: 46,
                    }} />
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                  </div>

                  <div style={{
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    gap: 22, flex: 1,
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e" }}>{fromCity}</div>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 3 }}>
                        {fromSub || `Starting point in ${fromCity}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e" }}>{toCity}</div>
                      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 3 }}>
                        {toSub || `Drop-off in ${toCity}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 2: Vehicle Details ── */}
            <div style={{
              background: "#fff", borderRadius: 20,
              padding: "26px 28px",
              boxShadow: "0 2px 14px rgba(15, 15, 46, 0.06)",
              border: "1px solid #eef0f4",
            }}>
              <div style={{
                fontWeight: 800, fontSize: 22, color: "#1a1a2e",
                marginBottom: 18, letterSpacing: "-0.3px",
              }}>
                Vehicle Details
              </div>

              {/* Soft blue pill with model name */}
              <div style={{ marginBottom: 22 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#e7eefc", color: "#1a1a2e",
                  borderRadius: 999, padding: "7px 14px",
                  fontSize: 13, fontWeight: 600,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M5 11l1.4-3.7A2 2 0 0 1 8.3 6h7.4a2 2 0 0 1 1.9 1.3L19 11h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H19a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H4.5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1H5z" />
                  </svg>
                  {vehicleModel || vehicleType}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 22, columnGap: 16 }}>
                <div>
                  <div style={{ fontSize: 14, color: "#1a1a2e", fontWeight: 600, marginBottom: 6 }}>Vehicle</div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>{vehicleModel || vehicleType}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, color: "#1a1a2e", fontWeight: 600, marginBottom: 6 }}>Color</div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>{vehicleColor}</div>
                </div>

                <div>
                  <div style={{ fontSize: 14, color: "#1a1a2e", fontWeight: 600, marginBottom: 6 }}>Plate Number</div>
                  {ride.plateNumber ? (
                    <div style={{
                      fontSize: 14, color: "#6b7280", fontWeight: 500,
                      filter: unlocked ? "none" : "blur(4px)",
                      userSelect: unlocked ? "text" : "none",
                      transition: "filter 0.3s ease",
                    }}>
                      {ride.plateNumber}
                    </div>
                  ) : (
                    <div style={{
                      width: 110, height: 14, borderRadius: 4,
                      background: "linear-gradient(90deg, #d1d5db 0%, #e5e7eb 50%, #d1d5db 100%)",
                      filter: "blur(1.5px)",
                    }} />
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, color: "#1a1a2e", fontWeight: 600, marginBottom: 6 }}>Type</div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>{vehicleType}</div>
                </div>
              </div>
            </div>

            {/* ── Card 3: Additional Information ── */}
            <div style={{
              background: "#fff", borderRadius: 20,
              padding: "24px 28px",
              boxShadow: "0 2px 14px rgba(15, 15, 46, 0.06)",
              border: "1px solid #eef0f4",
            }}>
              <div style={{
                fontWeight: 700, fontSize: 17, color: "#1a1a2e",
                marginBottom: 10, letterSpacing: "-0.2px",
              }}>
                Additional Information
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                {additional}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Booking / Contact sidebar ── */}
          <aside style={{ position: "sticky", top: 88 }}>
            <div style={{
              background: "#fff", borderRadius: 20,
              padding: "24px 22px",
              boxShadow: "0 2px 14px rgba(15, 15, 46, 0.06)",
              border: "1px solid #eef0f4",
              display: "flex", flexDirection: "column", gap: 16,
            }}>

              {/* Time row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#1a1a2e", fontSize: 14, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8"  y1="2" x2="8"  y2="6" />
                  <line x1="3"  y1="10" x2="21" y2="10" />
                </svg>
                {dtLabel}
              </div>

              {/* Seats row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#1a1a2e", fontSize: 14, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {seats} {seats === 1 ? "seat" : "seats"} available
              </div>

              {/* Contact Number — locked block matching Figma */}
              <div style={{
                background: "#f3f4f6",
                borderRadius: 12,
                padding: "14px 16px",
                position: "relative",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
                    Contact Number
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={unlocked ? "#22c55e" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div style={{
                  height: 18,
                  borderRadius: 6,
                  background: unlocked ? "transparent" : "linear-gradient(90deg,#d1d5db 0%,#e5e7eb 50%,#d1d5db 100%)",
                  filter: unlocked ? "none" : "blur(3px)",
                  color: "#1a1a2e", fontSize: 16, fontWeight: 700,
                  letterSpacing: "0.5px", padding: unlocked ? "0" : "0 8px",
                  display: "flex", alignItems: "center",
                  userSelect: unlocked ? "text" : "none",
                  transition: "all 0.3s ease",
                }}>
                  {unlocked ? contact : ""}
                </div>
              </div>

              {/* Red low-seat alert — always shown under the Contact
                  Number block whenever there are seats remaining and
                  the contact isn't unlocked yet. */}
              {seats > 0 && !unlocked && (
                <div style={{
                  background: "#fff5f5",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "11px 14px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13 }}>
                    Only {seats} {seats === 1 ? "seat" : "seats"} left!
                  </span>
                </div>
              )}

              {/* Yellow Unlock Contact button */}
              <button
                onClick={handleUnlock}
                disabled={unlocked || unlocking}
                style={{
                  background: unlocked ? "#22c55e" : "#f5c518",
                  color: "#111", border: "none", borderRadius: 12,
                  padding: "14px 0", width: "100%",
                  fontWeight: 700, fontSize: 15,
                  cursor: unlocked || unlocking ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, transition: "background 0.3s ease",
                  fontFamily: "inherit",
                  boxShadow: unlocked
                    ? "0 4px 14px rgba(34, 197, 94, 0.30)"
                    : "0 4px 14px rgba(245, 197, 24, 0.30)",
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  {unlocked
                    ? <polyline points="20 6 9 17 4 12"/>
                    : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>}
                </svg>
                {unlocked ? "Contact Unlocked!" : (unlocking ? "Unlocking…" : "Unlock Contact")}
              </button>

              <div style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", lineHeight: 1.5 }}>
                Secure payment • Get contact instantly
              </div>
            </div>
          </aside>

          {/* Mobile fallback: collapse sidebar under left column at narrow widths */}
          <style>{`
            @media (max-width: 900px) {
              .cu-grid { grid-template-columns: 1fr !important; padding: 18px 12px 40px !important; }
              .cu-grid > aside { position: static !important; }
            }
          `}</style>
        </main>
      )}

      <Footer />
    </div>
  );
}

  );
}
