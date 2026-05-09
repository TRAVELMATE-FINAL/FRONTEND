import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Spinner from "../components/Spinner/Spinner.jsx";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import { formatTime12h } from "../utils/time.js";

const API_BASE = import.meta.env.VITE_APP_URL || "http://localhost:5000";

/* ─── SVG ICONS (Lucide-style, matching Figma) ─── */
const UserIcon = ({ size = 14, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const MailIcon = ({ size = 14, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const PencilIcon = ({ size = 12, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
  </svg>
);
const CalendarIcon = ({ size = 11, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);
const ClockIcon = ({ size = 11, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const ShieldIcon = ({ size = 16, color = "#3b82f6" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2L3 6.5V12c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6.5L12 2z"/>
  </svg>
);
const MaleIcon = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="10" cy="14" r="5"/><path d="M21 3l-6.5 6.5M21 3h-6M21 3v6"/>
  </svg>
);
const FemaleIcon = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#be185d" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="9" r="5"/><path d="M12 14v8M9 19h6"/>
  </svg>
);
const ArrowRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const MapPin = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

/* ─── AVATAR ─── */
const Avatar = ({ name, size = 36, bg = "#7c3aed", fg = "#fff", photo }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: photo ? "transparent" : bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: fg, fontWeight: 800, fontSize: size * 0.38,
    fontFamily: "'Nunito', sans-serif", flexShrink: 0,
    overflow: "hidden",
  }}>
    {photo
      ? <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : (name?.[0]?.toUpperCase() || "?")}
  </div>
);

/* ─── VERIFIED BADGE ─── */
const VerifiedBadge = () => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 3,
    background: "#dcfce7", color: "#16a34a", fontSize: 9.5, fontWeight: 700,
    padding: "2px 7px", borderRadius: 20, fontFamily: "'Nunito', sans-serif",
  }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
    Verified
  </span>
);

/* ─── helpers ─── */
function fmtMember(iso) {
  if (!iso) return "Recently joined";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Recently joined";
  return "Member since " + d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function fmtRideDate(d, t) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d + " " + (t ? formatTime12h(t) : "");
  const datePart = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return t ? `${datePart}, ${formatTime12h(t)}` : datePart;
}

// Local-time YYYY-MM-DD — never use toISOString().slice(0,10) for "today",
// it returns UTC and can be a day off near midnight in local time zones.
function localTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Friendly relative date label for highlighting the very next ride.
function nextRideLabel(d, t) {
  if (!d) return "";
  const today = localTodayISO();
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return fmtRideDate(d, t);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`;
  if (d === today) return t ? `Today, ${formatTime12h(t)}` : "Today";
  if (d === tomorrowISO) return t ? `Tomorrow, ${formatTime12h(t)}` : "Tomorrow";
  return fmtRideDate(d, t);
}

/* ─── POSTED RIDE CARD ─── */
const PostedRideCard = ({ ride, driverName, driverPhoto }) => (
  <div style={{
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
    padding: "12px 13px", marginBottom: 10,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <div style={{ display: "flex", gap: 9, flex: 1, minWidth: 0 }}>
        <Avatar name={driverName} size={34} bg="#7c3aed" photo={driverPhoto} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#111827", fontFamily: "'Nunito', sans-serif" }}>
              {driverName}
            </span>
            <VerifiedBadge />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
            <MapPin />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "'Nunito', sans-serif" }}>{ride.from}</span>
            <ArrowRight />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "'Nunito', sans-serif" }}>{ride.to}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <CalendarIcon />
              <span style={{ fontSize: 10.5, color: "#9ca3af", fontFamily: "'Nunito', sans-serif" }}>
                {fmtRideDate(ride.date, ride.time)}
              </span>
            </span>
            <span style={{ fontSize: 10.5, color: "#9ca3af", fontFamily: "'Nunito', sans-serif" }}>
              💺 {ride.seatsAvailable} {ride.seatsAvailable === 1 ? "seat" : "seats"}
            </span>
          </div>

          {/* Vehicle details */}
          <div style={{
            border: "1px solid #bfdbfe", borderRadius: 7,
            padding: "7px 10px", background: "#eff6ff",
          }}>
            <div style={{ fontSize: 11, color: "#1d4ed8", fontFamily: "'Nunito', sans-serif", fontWeight: 700, marginBottom: 2 }}>
              {ride.vehicle === "Car" ? "🚗" : "🏍️"}{" "}
              {ride.vehicleModel || ride.vehicle}
              {ride.vehicleColor ? ` · ${ride.vehicleColor}` : ""}
            </div>
            {ride.plateNumber && (
              <div style={{ fontSize: 10, color: "#3b82f6", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                Plate: {ride.plateNumber}
              </div>
            )}
            <div style={{ fontSize: 9.5, color: "#3b82f6", fontFamily: "'Nunito', sans-serif", fontWeight: 600, marginTop: 2 }}>
              👁 {ride.viewCount} {ride.viewCount === 1 ? "view" : "views"}
              {ride.distance ? ` · ${ride.distance}` : ""}
              {ride.duration ? ` · ${ride.duration}` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ─── MAIN COMPONENT ─── */
export default function ProfileSettings() {
  const navigate = useNavigate();
  const phone = localStorage.getItem("phone") || "";

  // Side-by-side tabs — default to Upcoming so a freshly published
  // ride is visible without an extra click.
  const [activeTab, setActiveTab] = useState("upcoming");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      setError("You're not signed in. Please log in to see your profile.");
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");

    axios
      .get(`${API_BASE}/api/rides/by-user`, {
        params: { phone },
        timeout: 8000,
        signal: ctrl.signal,
      })
      .then(({ data: resp }) => {
        if (cancelled) return;
        setData(resp?.data || null);
      })
      .catch((err) => {
        if (cancelled || axios.isCancel(err)) return;
        const isNet = err?.code === "ERR_NETWORK" || err?.message === "Network Error";
        setError(
          isNet
            ? `Could not reach the backend at ${API_BASE}. Make sure the server is running.`
            : err?.response?.data?.message || "Could not load your profile."
        );
        console.error("[ProfileSettings] fetch failed:", err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; ctrl.abort(); };
  }, [phone]);

  const user = data?.user;
  const rides = data?.rides || [];

  // Recompute upcoming rides on the client too — keeps the count
  // accurate even if the backend's idea of "today" is a day off due to
  // server timezone, and lets us highlight the next ride below.
  const todayLocal = localTodayISO();
  const upcomingRides = rides
    .filter((r) => (r.date || "") >= todayLocal)
    .sort((a, b) => {
      // Sort by date asc, then time asc so the soonest sits at the top
      const da = (a.date || "") + " " + (a.time || "");
      const db = (b.date || "") + " " + (b.time || "");
      return da.localeCompare(db);
    });
  const nextRide = upcomingRides[0];

  const stats = {
    ...(data?.stats || { totalPosted: 0, totalSeatsOffered: 0 }),
    upcoming: upcomingRides.length,           // override server count
    totalPosted: rides.length,
  };

  const fullName = user?.fullName?.trim() || "TravelMate Rider";
  const email = user?.email?.trim() || "—";
  const genderRaw = (user?.gender || "").toLowerCase();
  const isFemale = genderRaw === "female";

  // If the page loads and the user has zero upcoming rides but at
  // least one historical one, auto-flip to "post" so they don't see
  // an empty Upcoming pane.
  useEffect(() => {
    if (!loading && rides.length > 0 && upcomingRides.length === 0) {
      setActiveTab("post");
    }
  }, [loading, rides.length, upcomingRides.length]);


  const card = {
    background: "#fff", borderRadius: 12, marginBottom: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden",
  };
  const cardHead = {
    padding: "13px 16px 11px", borderBottom: "1px solid #f3f4f6",
    fontSize: 13.5, fontWeight: 800, color: "#111827", fontFamily: "'Nunito', sans-serif",
  };

  return (
    <div className="ps-page" style={{ fontFamily: "'Nunito', sans-serif", background: "#f3f4f6", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        button{outline:none;}
        /* Wider, two-column layout on desktop, single column on phones */
        .ps-shell { max-width: 960px; margin: 0 auto; padding: 24px 24px 48px; }
        .ps-grid { display: grid; grid-template-columns: 320px 1fr; gap: 24px; align-items: start; }
        @media (max-width: 880px) {
          .ps-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .ps-shell { padding: 16px 14px 32px; }
        }
      `}</style>

      <Header />

      <div className="ps-shell" style={{ flex: 1, width: "100%" }}>

        {/* ══ Loading / Error states ══ */}
        {loading && (
          <div style={{ padding: 40 }}>
            <Spinner label="Loading your profile…" sublabel="Fetching your rides" />
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: 16 }}>
            <div style={{
              background: "#fff5f5", border: "1px solid #fecaca",
              color: "#dc2626", borderRadius: 12, padding: 16, textAlign: "center",
            }}>
              {error}
            </div>
            <button
              onClick={() => navigate("/find-ride")}
              style={{
                marginTop: 14, width: "100%",
                background: "#2563eb", color: "#fff", border: "none",
                borderRadius: 10, padding: "12px",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* ══ PROFILE HEADER ══ */}
        {!loading && !error && (
          <div className="ps-grid">
            {/* ── LEFT column: profile + personal info ── */}
            <div>
            <div style={{ background: "#fff", textAlign: "center", paddingBottom: 20, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              <div style={{ height: 44, background: "#f9fafb", borderBottom: "1px solid #f0f0f0" }} />

              {/* Profile photo or generated avatar */}
              <div style={{
                width: 80, height: 80, borderRadius: "50%", overflow: "hidden",
                margin: "-8px auto 10px", border: "3px solid #fff",
                boxShadow: "0 2px 10px rgba(0,0,0,0.13)",
                background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 30, fontWeight: 800,
              }}>
                {user?.photo
                  ? <img src={user.photo} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : fullName.charAt(0).toUpperCase()}
              </div>

              <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", fontFamily: "'Nunito', sans-serif", marginBottom: 6 }}>
                {fullName}
              </div>

              {/* Gender badge */}
              {user?.gender && (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: isFemale ? "#fdf2f8" : "#eff6ff",
                    color: isFemale ? "#be185d" : "#2563eb",
                    fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 20, fontFamily: "'Nunito', sans-serif",
                    border: `1px solid ${isFemale ? "#fbcfe8" : "#bfdbfe"}`,
                  }}>
                    {isFemale ? <FemaleIcon /> : <MaleIcon />}&nbsp;
                    {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
                  </span>
                </div>
              )}

              <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'Nunito', sans-serif" }}>
                {fmtMember(user?.memberSince)}
              </div>

              {/* Quick stats */}
              <div style={{
                display: "flex", justifyContent: "center", gap: 26,
                marginTop: 14, padding: "0 20px",
              }}>
                <Stat big={stats.totalPosted} label="Rides" />
                <Stat big={stats.upcoming} label="Upcoming" />
                <Stat big={stats.totalSeatsOffered} label="Seats offered" />
              </div>
            </div>

            {/* Personal information sits in the LEFT column on desktop,
                stacks below the avatar on mobile (single-column grid). */}
            <div style={{ marginTop: 16 }}>

              {/* ── PERSONAL INFORMATION ── */}
              <div style={card}>
                <div style={cardHead}>Personal Information</div>
                <div style={{ padding: 13 }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 9, padding: "11px 13px", background: "#fafafa" }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {/* Full Name */}
                      <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#111827", fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>
                          Full Name
                        </div>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 8px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                            <UserIcon size={13} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "'Nunito', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {fullName}
                            </span>
                          </div>
                          <button onClick={() => navigate("/profile-setup")} style={editBtn}>
                            <PencilIcon />
                          </button>
                        </div>
                      </div>
                      {/* Email */}
                      <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#111827", fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>
                          Email Address
                        </div>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 8px",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                            <MailIcon size={13} />
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#111827", fontFamily: "'Nunito', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {email}
                            </span>
                          </div>
                          <button onClick={() => navigate("/profile-setup")} style={editBtn}>
                            <PencilIcon />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Phone (read-only) */}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#111827", fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>
                        Phone
                      </div>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, padding: "7px 8px",
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", fontFamily: "'Nunito', sans-serif" }}>
                          {user?.phone || phone || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            </div>{/* end LEFT column */}

            {/* ── RIGHT column: rides + safety tip ── */}
            <div>

              {/* ── NEXT UPCOMING RIDE — highlighted at the top ── */}
              {nextRide && (
                <div style={{
                  background: "linear-gradient(135deg, #ecfdf5 0%, #dcfce7 100%)",
                  border: "1px solid #a7f3d0",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 14,
                  display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "#10b981", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, flexShrink: 0,
                  }}>
                    🚗
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "#065f46", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                      Your next ride
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#064e3b", fontFamily: "'Nunito', sans-serif", marginBottom: 2 }}>
                      {nextRide.from} → {nextRide.to}
                    </div>
                    <div style={{ fontSize: 12, color: "#047857", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                      {nextRideLabel(nextRide.date, nextRide.time)}
                      {" · "}
                      💺 {nextRide.seatsAvailable} {nextRide.seatsAvailable === 1 ? "seat" : "seats"} left
                    </div>
                  </div>
                </div>
              )}

              {/* ── MY RIDES (Upcoming | Posted Rides — side-by-side tabs) ── */}
              <div style={card}>
                <div style={{ padding: "13px 16px 6px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#111827", fontFamily: "'Nunito', sans-serif", marginBottom: 2 }}>
                    My Rides
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'Nunito', sans-serif" }}>
                    Switch between your upcoming trips and everything you've posted.
                  </div>
                </div>

                {/* Tabs — Upcoming sits on the left because that's the
                    most relevant view right after publishing a ride. */}
                <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6" }}>
                  {[
                    { k: "upcoming", l: `Upcoming (${upcomingRides.length})` },
                    { k: "post",     l: `Posted Rides (${rides.length})` },
                  ].map(t => (
                    <button key={t.k} onClick={() => setActiveTab(t.k)} style={{
                      flex: 1, padding: "10px 0", fontSize: 12.5, fontWeight: 700,
                      background: "transparent", border: "none", cursor: "pointer",
                      color: activeTab === t.k ? "#2563eb" : "#9ca3af",
                      borderBottom: activeTab === t.k ? "2px solid #2563eb" : "2px solid transparent",
                      fontFamily: "'Nunito', sans-serif", transition: "color 0.15s",
                    }}>{t.l}</button>
                  ))}
                </div>

                <div style={{ padding: "11px 11px 3px" }}>
                  {(() => {
                    const list = activeTab === "upcoming" ? upcomingRides : rides;
                    if (list.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "26px 0", color: "#9ca3af", fontSize: 12.5, fontFamily: "'Nunito', sans-serif" }}>
                          {activeTab === "upcoming"
                            ? rides.length > 0
                              ? "No upcoming rides — all your rides are in the past."
                              : "No upcoming rides yet."
                            : "You haven't posted any rides yet."}
                          <div style={{ marginTop: 10 }}>
                            <button
                              onClick={() => navigate("/post-ride")}
                              style={{
                                background: "#2563eb", color: "#fff", border: "none",
                                borderRadius: 8, padding: "8px 18px",
                                fontWeight: 700, fontSize: 12, cursor: "pointer",
                              }}
                            >
                              {rides.length > 0 ? "Post another ride" : "Post your first ride"}
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return list.map((r) => {
                      // In the "Posted Rides" tab we still want past trips
                      // to be visually de-emphasised so the user can scan
                      // the active ones quickly.
                      const isUpcoming = (r.date || "") >= todayLocal;
                      const dim = activeTab === "post" && !isUpcoming;
                      return (
                        <div key={r._id} style={{ position: "relative" }}>
                          {dim && (
                            <span style={{
                              position: "absolute", top: 14, right: 14, zIndex: 2,
                              background: "#f3f4f6", color: "#6b7280",
                              fontSize: 10, fontWeight: 800,
                              padding: "2px 8px", borderRadius: 20,
                              fontFamily: "'Nunito', sans-serif",
                              border: "1px solid #e5e7eb",
                            }}>PAST</span>
                          )}
                          <div style={{ opacity: dim ? 0.7 : 1 }}>
                            <PostedRideCard
                              ride={r}
                              driverName={fullName}
                              driverPhoto={user?.photo}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* ── Safety tip card ── */}
              <div style={{
                ...card, padding: 0,
              }}>
                <div style={{
                  margin: 0, borderRadius: 12,
                  background: "#eff6ff", padding: "13px 14px",
                  display: "flex", gap: 9, alignItems: "flex-start",
                }}>
                  <ShieldIcon size={16} color="#3b82f6" />
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "#1d4ed8", marginBottom: 3, fontFamily: "'Nunito', sans-serif" }}>
                      Travel safely
                    </div>
                    <div style={{ fontSize: 10.5, color: "#2563eb", lineHeight: 1.55, fontFamily: "'Nunito', sans-serif" }}>
                      Always meet new ride partners in a public spot and verify the vehicle plate before getting in.
                    </div>
                  </div>
                </div>
              </div>

            </div>{/* end RIGHT column */}
          </div>
        )}

      </div>

      <Footer />
    </div>
  );
}

const editBtn = {
  background: "transparent", border: "none", cursor: "pointer",
  padding: 2, display: "flex", alignItems: "center",
};

function Stat({ big, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", fontFamily: "'Nunito', sans-serif" }}>{big}</div>
      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, fontFamily: "'Nunito', sans-serif" }}>{label}</div>
    </div>
  );
}
