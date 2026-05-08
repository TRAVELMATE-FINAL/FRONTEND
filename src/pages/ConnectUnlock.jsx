import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const API_BASE = "http://localhost:5000";

/* Format "YYYY-MM-DD" + "HH:MM" → "Today, 3:00 PM" / "Tomorrow, 8:30 AM" / "5 May, 11:00 AM" */
function formatDateTime(date, time) {
  if (!date && !time) return "—";
  const d = new Date(`${date}T${time || "00:00"}`);
  if (isNaN(d.getTime())) return `${date || ""} ${time || ""}`.trim();

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

  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  const t = `${h}:${m} ${ap}`;
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

  const handleUnlock = async () => {
    if (!rideId || unlocked) return;

    // ── Auth gate (strict) ────────────────────────────────
    // The user must be logged in with a verified phone before they can
    // unlock a contact. If not, save the rideId and send them through
    // /login → /otp → (/profile-setup if new) → back here.
    if (!isLoggedIn()) {
      sendToLogin();
      return;
    }

    try {
      setUnlocking(true);
      const { data } = await axios.post(
        `${API_BASE}/api/rides/${rideId}/unlock`,
        { phone: localStorage.getItem("phone") }
      );
      const unlockedPhone = data?.data?.phone || "";

      // Backend returned 200 but no phone? Treat as auth failure too —
      // wipe the stale phone and route the user back through /login.
      if (!unlockedPhone) {
        localStorage.removeItem("phone");
        sendToLogin();
        return;
      }

      setContact(unlockedPhone);
      setUnlocked(true);
    } catch (err) {
      const status  = err?.response?.status;
      const message = err?.response?.data?.error || err?.response?.data?.message || "";

      // Treat any auth-ish failure (401/403/404) OR "no contact info" as
      // "user is not really logged in" → bounce to /login so the OTP flow
      // can re-establish the session and re-issue the unlock.
      const looksLikeAuthFail =
        status === 401 ||
        status === 403 ||
        status === 404 ||
        /no contact info|not authorized|not logged|missing phone/i.test(message);

      if (looksLikeAuthFail) {
        localStorage.removeItem("phone");
        sendToLogin();
        return;
      }

      alert(message || "Could not unlock contact");
    } finally {
      setUnlocking(false);
    }
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: "#e8eaef" }}>

      <Header />

      {/* Status banners */}
      {loading && (
        <div style={{ padding: "60px 16px", textAlign: "center", color: "#475569", fontSize: 14 }}>
          ⏳ Loading ride details…
        </div>
      )}
      {!loading && error && (
        <div style={{ margin: "40px auto", maxWidth: 520, padding: 24, background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 12, textAlign: "center" }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && ride && (
        <main style={{
          flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start",
          padding: "40px 16px", gap: "24px", flexWrap: "wrap"
        }}>
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "500px" }}>

            {/* ── Card 1: Driver Header ── */}
            <div style={{ background: "#fff", borderRadius: "18px", padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "22px" }}>
                {/* Avatar — photo if uploaded, else initial */}
                <div style={{
                  width: "52px", height: "52px", borderRadius: "50%",
                  background: driverPhoto ? "#f3f4f6" : "#7c3aed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, overflow: "hidden"
                }}>
                  {driverPhoto
                    ? <img src={driverPhoto} alt={driverName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontWeight: 800, fontSize: "20px", letterSpacing: "-0.5px" }}>{initial}</span>}
                </div>

                <span style={{ fontWeight: 800, fontSize: "20px", color: "#111", flex: 1, letterSpacing: "-0.3px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {driverName}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "5px",
                  background: "#fff8e1", border: "1.5px solid #f59f00",
                  borderRadius: "20px", padding: "5px 13px" }}>
                  <span style={{ color: "#f59f00", fontSize: "13px" }}>★</span>
                  <span style={{ color: "#111", fontWeight: 700, fontSize: "13px" }}>4.8(43)</span>
                </div>

                <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: "#999", fontSize: "18px", letterSpacing: "2px" }}>
                  •••
                </button>
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "#888", marginBottom: "14px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                  Route
                </div>

                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "3px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#3b82f6", border: "2px solid #3b82f6", flexShrink: 0 }} />
                    <div style={{ width: "2px", flex: 1, margin: "4px 0",
                      background: "repeating-linear-gradient(to bottom, #ccc 0px, #ccc 5px, transparent 5px, transparent 10px)",
                      minHeight: "38px" }} />
                    <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#22c55e", border: "2px solid #22c55e", flexShrink: 0 }} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "20px", flex: 1 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "#111" }}>{fromCity}</div>
                      <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>{fromSub || `Starting point in ${fromCity}`}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "#111" }}>{toCity}</div>
                      <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>{toSub || `Drop-off in ${toCity}`}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 2: Vehicle Details ── */}
            <div style={{ background: "#fff", borderRadius: "18px", padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "#111", marginBottom: "16px", letterSpacing: "-0.2px" }}>
                Vehicle Details
              </div>

              <div style={{ marginBottom: "18px" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  border: "1.5px solid #e5e7eb", borderRadius: "8px",
                  padding: "5px 12px", fontSize: "12px", fontWeight: 600, color: "#555",
                  background: "#fafafa"
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
                    <rect x="7" y="14" width="10" height="6" rx="1"/>
                    <circle cx="8" cy="20" r="1"/><circle cx="16" cy="20" r="1"/>
                  </svg>
                  {vehicleModel || vehicleType}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 0", borderTop: "1px solid #f3f4f6", paddingTop: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#aaa", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Vehicle</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#111" }}>{vehicleModel || vehicleType}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "12px", color: "#aaa", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Color</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#111" }}>{vehicleColor}</div>
                </div>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "14px" }}>
                  <div style={{ fontSize: "12px", color: "#aaa", fontWeight: 600, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Plate Number</div>
                  {ride.plateNumber ? (
                    <div style={{
                      fontSize: "14px", fontWeight: 700, color: "#111",
                      filter: unlocked ? "none" : "blur(4px)",
                      userSelect: unlocked ? "text" : "none",
                      transition: "filter 0.3s ease",
                    }}>
                      {ride.plateNumber}
                    </div>
                  ) : (
                    <div style={{
                      width: "110px", height: "14px", borderRadius: "4px",
                      background: "linear-gradient(90deg, #d1d5db 0%, #e5e7eb 50%, #d1d5db 100%)",
                      filter: "blur(1.5px)"
                    }} />
                  )}
                </div>
                <div style={{ textAlign: "right", borderTop: "1px solid #f3f4f6", paddingTop: "14px" }}>
                  <div style={{ fontSize: "12px", color: "#aaa", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>Type</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#111" }}>{vehicleType}</div>
                </div>
              </div>
            </div>

            {/* ── Card 3: Additional Information ── */}
            <div style={{ background: "#fff", borderRadius: "18px", padding: "22px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontWeight: 800, fontSize: "16px", color: "#111", marginBottom: "10px", letterSpacing: "-0.2px" }}>
                Additional Information
              </div>
              <div style={{ fontSize: "14px", color: "#666", lineHeight: "1.6" }}>
                {additional}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Booking/Contact card ── */}
          <div style={{ width: "100%", maxWidth: "280px" }}>
            <div style={{
              background: "#fff", borderRadius: "18px",
              padding: "22px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", gap: "14px"
            }}>

              <div style={{ display: "flex", alignItems: "center", gap: "9px", color: "#333", fontSize: "14px", fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {dtLabel}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "9px", color: "#333", fontSize: "14px", fontWeight: 600 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {seats} {seats === 1 ? "seat" : "seats"} available
              </div>

              <div style={{ height: "1px", background: "#f0f0f0" }} />

              {/* Contact Number field */}
              <div>
                <div style={{
                  border: "1.5px solid #e5e7eb", borderRadius: "10px",
                  padding: "12px 14px", display: "flex",
                  alignItems: "center", justifyContent: "space-between",
                  background: "#fafafa"
                }}>
                  <span style={{
                    fontSize: "14px",
                    color: unlocked ? "#111" : "#bbb",
                    fontWeight: unlocked ? 700 : 400,
                    letterSpacing: unlocked ? "1px" : "0",
                    filter: unlocked ? "none" : "blur(4px)",
                    userSelect: unlocked ? "text" : "none",
                    transition: "all 0.3s ease"
                  }}>
                    {unlocked ? contact : (maskedPhone || "Contact Number")}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={unlocked ? "#22c55e" : "#ccc"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>

              {seats > 0 && seats <= 2 && !unlocked && (
                <div style={{
                  border: "1.5px solid #fecaca", borderRadius: "10px",
                  padding: "11px 14px", display: "flex",
                  alignItems: "center", gap: "8px", background: "#fff5f5"
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "13px" }}>
                    Only {seats} {seats === 1 ? "seat" : "seats"} left!
                  </span>
                </div>
              )}

              <button
                onClick={handleUnlock}
                disabled={unlocked || unlocking}
                style={{
                  background: unlocked ? "#22c55e" : "#e8b800",
                  color: "#111", border: "none", borderRadius: "12px",
                  padding: "14px 0", width: "100%",
                  fontWeight: 800, fontSize: "15px",
                  cursor: unlocked || unlocking ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "8px", transition: "background 0.3s ease",
                  letterSpacing: "-0.1px"
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {unlocked
                    ? <polyline points="20 6 9 17 4 12"/>
                    : <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></>}
                </svg>
                {unlocked ? "Contact Unlocked!" : (unlocking ? "Unlocking…" : "Unlock Contact")}
              </button>

              <div style={{ textAlign: "center", fontSize: "12px", color: "#aaa", lineHeight: "1.5" }}>
                Secure payment • Get contact instantly
              </div>
            </div>
          </div>
        </main>
      )}

      <Footer />
    </div>
  );
}
