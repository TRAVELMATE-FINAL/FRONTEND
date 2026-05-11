import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Spinner from "../components/Spinner/Spinner.jsx";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import { formatTime12h } from "../utils/time.js";

const API_BASE = import.meta.env.VITE_APP_URL || "http://localhost:5000";

/* ─────────────── SVG ICONS ─────────────── */
const UserIcon = ({ size = 14, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const MailIcon = ({ size = 14, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const PencilIcon = ({ size = 14, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);
const CalendarIcon = ({ size = 12, color = "#9ca3af" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const ShieldIcon = ({ size = 16, color = "#3b82f6" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2L3 6.5V12c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6.5L12 2z" />
  </svg>
);
const MaleIcon = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="10" cy="14" r="5" /><path d="M21 3l-6.5 6.5M21 3h-6M21 3v6" />
  </svg>
);
const FemaleIcon = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#be185d" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="12" cy="9" r="5" /><path d="M12 14v8M9 19h6" />
  </svg>
);
const ArrowRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const MapPin = ({ size = 11 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
/* Square pencil-on-paper edit icon — matches Figma's edit glyph */
const EditCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
/* Bin/trash icon — Figma's standard delete glyph */
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

/* ─── shared avatar ─── */
const Avatar = ({ name, size = 36, bg = "#7c3aed", fg = "#fff", photo }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: photo ? "transparent" : bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: fg, fontWeight: 800, fontSize: size * 0.38,
    flexShrink: 0, overflow: "hidden",
  }}>
    {photo
      ? <img src={photo} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : (name?.[0]?.toUpperCase() || "?")}
  </div>
);

const VerifiedBadge = ({ label = "Innova" }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "#dcfce7", color: "#16a34a",
    fontSize: 10.5, fontWeight: 700,
    padding: "2px 9px", borderRadius: 20,
  }}>
    <svg width="9" height="9" viewBox="0 0 9 9" fill="#16a34a"><circle cx="4.5" cy="4.5" r="4.5" /><polyline points="2,5 4,7 7,3" stroke="white" strokeWidth="1.2" fill="none" /></svg>
    {label}
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

function localTodayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── Posted Ride Card (Figma) ─── */
const PostedRideCard = ({ ride, driverName, driverPhoto, onDelete }) => (
  <div style={{
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "14px 16px",
    marginBottom: 12,
    display: "flex", gap: 14, alignItems: "flex-start",
  }}>
    {/* Avatar (pink to match Figma) */}
    <Avatar name={driverName} size={36} bg="#ec4899" photo={driverPhoto} />

    {/* Main content */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{driverName}</span>
        <VerifiedBadge label={ride.vehicleModel || ride.vehicle || "Verified"} />
      </div>
      <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginBottom: 6 }}>★ 4.9</div>

      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <MapPin />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{ride.from}</span>
        <ArrowRight />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{ride.to}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
        <CalendarIcon />
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtRideDate(ride.date, ride.time)}</span>
      </div>

      {/* Light-blue contact box */}
      <div style={{
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        padding: "8px 12px",
      }}>
        <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600, marginBottom: 2 }}>
          Contact: <span style={{ color: "#1e40af", fontWeight: 700 }}>9876543210</span>
        </div>
        <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600 }}>
          You have access to contact details
        </div>
      </div>
    </div>

    {/* Right column — edit + delete circular buttons */}
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
      <button type="button" aria-label="Edit"
        style={{
          width: 30, height: 30, borderRadius: "50%",
          border: "none", background: "#374151",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
        <EditCircleIcon />
      </button>
      <button type="button" aria-label="Delete"
        onClick={() => onDelete && onDelete(ride._id)}
        style={{
          width: 30, height: 30, borderRadius: "50%",
          border: "none", background: "#ef4444",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
        <TrashIcon />
      </button>
    </div>
  </div>
);

/* ─── Blocked User Row (2-up) ─── */
const blockedColors = {
  A: { bg: "#dbeafe", fg: "#1d4ed8" },
  P: { bg: "#fce7f3", fg: "#be185d" },
  J: { bg: "#ede9fe", fg: "#7c3aed" },
  L: { bg: "#dcfce7", fg: "#15803d" },
};
const BlockedHalf = ({ user, onUnblock }) => {
  const c = blockedColors[user.name?.[0]] || { bg: "#e5e7eb", fg: "#374151" };
  return (
    <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0, gap: 10 }}>
      <Avatar name={user.name} size={36} bg={c.bg} fg={c.fg} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {user.name}
        </div>
        <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>{user.date}</div>
      </div>
      <button
        type="button"
        onClick={() => onUnblock(user.id)}
        style={{
          background: "#fff",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          padding: "6px 14px",
          fontSize: 12, fontWeight: 700,
          color: "#374151", cursor: "pointer",
          fontFamily: "inherit", flexShrink: 0,
        }}>
        Unblock
      </button>
    </div>
  );
};

/* ─── MAIN PAGE ─── */
export default function ProfileSettings() {
  const navigate = useNavigate();
  const phone = localStorage.getItem("phone") || "";

  const [activeTab, setActiveTab] = useState("post"); // "booked" | "post"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Blocked users — persisted per-account in localStorage. Starts
  // empty; rows only appear if the user has actually blocked someone.
  // The block action is wired elsewhere in the app (e.g. RideDetail's
  // "..." menu) and writes into "blockedUsers:<phone>".
  const blockedKey = `blockedUsers:${phone}`;
  const [blocked, setBlocked] = useState(() => {
    try {
      const raw = localStorage.getItem(blockedKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });
  const unblock = (id) => {
    setBlocked((prev) => {
      const next = prev.filter((u) => u.id !== id);
      try { localStorage.setItem(blockedKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Fetch the user's profile + their rides
  useEffect(() => {
    if (!phone) {
      setLoading(false);
      setError("You're not signed in. Please log in to see your profile.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");

    axios
      .get(`${API_BASE}/api/rides/by-user`, {
        params: { phone },
        timeout: 8000,
      })
      .then(({ data: resp }) => {
        if (cancelled) return;
        setData(resp?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        const isNet = err?.code === "ERR_NETWORK" || err?.message === "Network Error";
        setError(
          isNet
            ? `Could not reach the backend at ${API_BASE}. Make sure the server is running.`
            : err?.response?.data?.message || "Could not load your profile."
        );
        console.error("[ProfileSettings] fetch failed:", err);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [phone]);

  const user = data?.user;
  const rides = data?.rides || [];

  // Booked rides aren't tracked separately yet — same Posted list for now
  const bookedRides = rides;

  const fullName = user?.fullName?.trim() || "Akash Kumar";
  const email    = user?.email?.trim()    || "Kumar@email.com";
  const isFemale = (user?.gender || "").toLowerCase() === "female";

  // Pair blocked users into rows of 2 (Figma layout)
  const blockedPairs = [];
  for (let i = 0; i < blocked.length; i += 2) {
    blockedPairs.push([blocked[i], blocked[i + 1] || null]);
  }

  const cardStyle = {
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 2px 12px rgba(15, 15, 46, 0.05)",
    border: "1px solid #eef0f4",
    marginBottom: 18,
    overflow: "hidden",
  };

  return (
    <div className="ps-page" style={{
      fontFamily: "'Plus Jakarta Sans', 'Inter', 'Nunito', system-ui, sans-serif",
      background: "#f3f4f6", minHeight: "100vh",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        .ps-shell { max-width: 720px; margin: 0 auto; width: 100%; padding: 0 14px 36px; box-sizing: border-box; }
        @media (max-width: 640px) {
          .ps-shell { padding: 0 10px 28px; }
          .ps-page .ps-hero-avatar { width: 80px !important; height: 80px !important; font-size: 30px !important; }
          .ps-page .ps-hero-name { font-size: 19px !important; }
        }
        @media (max-width: 480px) {
          .ps-shell { padding: 0 8px 24px; }
          .ps-page .ps-hero-avatar { width: 72px !important; height: 72px !important; font-size: 26px !important; }
          .ps-page .ps-hero-name { font-size: 17px !important; }
        }
      `}</style>

      <Header />

      {/* Hero gradient header */}
      <div style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f3f4f6 100%)",
        textAlign: "center",
        padding: "32px 16px 28px",
      }}>
        <div className="ps-hero-avatar" style={{
          width: 96, height: 96, borderRadius: "50%",
          margin: "0 auto 14px", overflow: "hidden",
          background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 36, fontWeight: 800,
          border: "3px solid #fff",
          boxShadow: "0 6px 18px rgba(15,15,46,0.12)",
        }}>
          {user?.photo
            ? <img src={user.photo} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : fullName.charAt(0).toUpperCase()}
        </div>

        <div className="ps-hero-name" style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8, letterSpacing: "-0.3px" }}>
          {fullName}
        </div>

        {/* Gender pill */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 999,
            padding: "5px 14px",
            fontSize: 12, fontWeight: 700,
            color: "#374151",
          }}>
            <UserIcon size={11} color="#6b7280" />
            {user?.gender || "Male"}
          </span>
        </div>

        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {fmtMember(user?.memberSince) || "Member since 2026"}
        </div>
      </div>

      {/* Body */}
      <div className="ps-shell" style={{ flex: 1, marginTop: 12 }}>

        {loading && (
          <Spinner label="Loading your profile…" sublabel="Fetching your rides" />
        )}

        {!loading && error && (
          <div style={{
            background: "#fff5f5", border: "1px solid #fecaca",
            color: "#dc2626", borderRadius: 12, padding: 16, textAlign: "center",
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── PERSONAL INFORMATION ── */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px 12px", fontSize: 15, fontWeight: 800, color: "#111827" }}>
                Personal Information
              </div>
              <div style={{ padding: "0 16px 16px" }}>
                <div style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "14px 14px 14px",
                  background: "#fafafa",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 10 }}>
                    Personal Information
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {/* Full Name */}
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#374151", fontWeight: 700, marginBottom: 5 }}>Full Name</div>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "9px 11px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <UserIcon size={13} />
                          <span style={{
                            fontSize: 13, fontWeight: 700, color: "#111827",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>{fullName.split(" ")[0]}</span>
                        </div>
                        <button onClick={() => navigate("/profile-setup")} style={editBtn} aria-label="Edit name">
                          <PencilIcon size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Email Address */}
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#374151", fontWeight: 700, marginBottom: 5 }}>Email Address</div>
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "9px 11px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <MailIcon size={13} />
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: "#111827",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>{email}</span>
                        </div>
                        <button onClick={() => navigate("/profile-setup")} style={editBtn} aria-label="Edit email">
                          <PencilIcon size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── MY RIDES ── */}
            <div style={cardStyle}>
              <div style={{ padding: "14px 20px 4px" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 2 }}>My Rides</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>Manage your posted and booked rides</div>
              </div>

              {/* Tabs — Booked Ride | Post Ride */}
              <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", marginTop: 10 }}>
                {[
                  { k: "booked", l: "Booked Ride" },
                  { k: "post",   l: "Post Ride" },
                ].map((t) => (
                  <button key={t.k} type="button" onClick={() => setActiveTab(t.k)}
                    style={{
                      flex: 1, padding: "11px 0",
                      background: "transparent", border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 700,
                      color: activeTab === t.k ? "#2563eb" : "#9ca3af",
                      borderBottom: activeTab === t.k ? "2px solid #2563eb" : "2px solid transparent",
                      fontFamily: "inherit",
                      transition: "color 0.15s",
                    }}>
                    {t.l}
                  </button>
                ))}
              </div>

              <div style={{ padding: "14px 14px 6px" }}>
                {(() => {
                  const list = activeTab === "booked" ? bookedRides : rides;
                  if (list.length === 0) {
                    return (
                      <div style={{
                        textAlign: "center", padding: "26px 0",
                        color: "#9ca3af", fontSize: 13,
                      }}>
                        {activeTab === "booked" ? "No booked rides yet." : "You haven't posted any rides yet."}
                        <div style={{ marginTop: 10 }}>
                          <button onClick={() => navigate("/post-ride")} style={{
                            background: "#2563eb", color: "#fff",
                            border: "none", borderRadius: 8,
                            padding: "8px 18px", fontWeight: 700, fontSize: 12,
                            cursor: "pointer", fontFamily: "inherit",
                          }}>
                            Post your first ride
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return list.map((r) => (
                    <PostedRideCard
                      key={r._id}
                      ride={r}
                      driverName={fullName}
                      driverPhoto={user?.photo}
                    />
                  ));
                })()}
              </div>
            </div>

            {/* ── BLOCKED USERS ── */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 20px 8px" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                  Blocked Users
                </div>
                <div style={{ fontSize: 11.5, color: "#6b7280", lineHeight: 1.55 }}>
                  When you block someone, they won't be able to message you, see your active status,
                  or interact with your posts. Review and manage your list below.
                </div>
              </div>

              <div style={{ padding: "0 20px 6px" }}>
                {blockedPairs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "18px 0", color: "#9ca3af", fontSize: 12 }}>
                    No blocked users.
                  </div>
                ) : (
                  blockedPairs.map((pair, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 0",
                      borderBottom: i === blockedPairs.length - 1 ? "none" : "1px solid #f3f4f6",
                    }}>
                      <BlockedHalf user={pair[0]} onUnblock={unblock} />
                      {pair[1] && (
                        <>
                          <div style={{ width: 1, height: 36, background: "#e5e7eb", flexShrink: 0 }} />
                          <BlockedHalf user={pair[1]} onUnblock={unblock} />
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Safety tip — blue alert at bottom of card */}
              <div style={{
                margin: "10px 20px 18px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <ShieldIcon size={16} color="#3b82f6" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", marginBottom: 3 }}>
                    Safety Tip
                  </div>
                  <div style={{ fontSize: 11.5, color: "#2563eb", lineHeight: 1.55 }}>
                    Unblocking a user will allow them to find your profile and message you again. They will not be notified that you unblocked them, but they may notice your content reappearing in their feed.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

const editBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 2,
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
};
