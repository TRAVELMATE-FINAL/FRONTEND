import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Spinner from "../components/Spinner/Spinner.jsx";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import { formatTime12h } from "../utils/time.js";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

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
const PostedRideCard = ({ ride, driverName, driverPhoto, onEdit, onDelete }) => (
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
      <button type="button" aria-label="Edit ride"
        onClick={() => onEdit && onEdit(ride)}
        title="Edit ride"
        style={{
          width: 30, height: 30, borderRadius: "50%",
          border: "none", background: "#374151",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
        <EditCircleIcon />
      </button>
      <button type="button" aria-label="Delete ride"
        onClick={() => onDelete && onDelete(ride._id)}
        title="Delete ride"
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
  // True when no phone is stashed in localStorage — i.e. the user has
  // never logged in on this device. We hide ALL personal cards in this
  // state and replace the hero with a "Log in to see your profile" CTA
  // so we don't leak fake placeholders like "Your Name" / "Male".
  const notLoggedIn = !phone;

  const [activeTab, setActiveTab] = useState("post"); // "booked" | "post"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Blocked users — pulled from the backend so they're shared across
  // devices, not just one browser. Each item is normalized to the shape
  // BlockedHalf expects: { id, name, date }.
  const [blocked, setBlocked] = useState([]);

  useEffect(() => {
    if (!phone) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/users/blocked`, { params: { phone }, timeout: 8000 })
      .then(({ data: resp }) => {
        if (cancelled) return;
        const items = Array.isArray(resp?.data) ? resp.data : [];
        setBlocked(
          items.map((b) => ({
            id: b.blockedPhone,
            name: b.blockedName || "Blocked User",
            date: new Date(b.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          }))
        );
      })
      .catch(() => { /* leave list empty on failure */ })
      .finally(() => {});
    return () => { cancelled = true; };
  }, [phone]);

  // ── Ride: delete + edit ──────────────────────────────────────
  // Both buttons in the Posted Ride card route through these handlers.
  // Delete  -> DELETE /api/rides/:id  (optimistic remove, rollback on fail)
  // Edit    -> open modal, PATCH /api/rides/:id  on save
  const [editingRide, setEditingRide] = useState(null); // ride object being edited
  const [editForm, setEditForm] = useState({});         // local form state for the modal
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const removeRideFromState = (id) => {
    setData((d) => {
      if (!d || !Array.isArray(d.rides)) return d;
      return { ...d, rides: d.rides.filter((r) => r._id !== id) };
    });
  };

  const handleDelete = async (rideId) => {
    if (!rideId) return;
    if (!phone) {
      window.alert("You need to be logged in to delete your rides.");
      return;
    }
    // Cheap built-in confirm — keeps the surface tiny. Replace with a
    // styled modal later if Figma calls for one.
    const yes = window.confirm("Delete this ride? This can't be undone.");
    if (!yes) return;
    // Optimistic remove + rollback if the API call fails.
    const before = data;
    removeRideFromState(rideId);
    try {
      // IMPORTANT: send `phone` in the QUERY STRING, not just the body.
      // Some hosting layers (and a number of CORS proxies) strip the
      // request body off DELETE requests, which made the backend reply
      // "phone is required" and the delete silently rolled back. The
      // server route already accepts either source — query is just the
      // reliable one. We keep `data` set too as a belt-and-braces fallback.
      const url = `${API_BASE}/api/rides/${rideId}?phone=${encodeURIComponent(phone)}`;
      await axios.delete(url, {
        data: { phone },
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });
    } catch (e) {
      console.error("Delete ride failed:", e?.response?.status, e?.response?.data || e);
      setData(before); // rollback
      window.alert(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Could not delete the ride. Please try again."
      );
    }
  };

  const handleEdit = (ride) => {
    if (!ride) return;
    setEditingRide(ride);
    setEditForm({
      date: ride.date || "",
      time: ride.time || "",
      seatsAvailable: ride.seatsAvailable || 1,
      vehicle: ride.vehicle || "Car",
      vehicleModel: ride.vehicleModel || "",
      vehicleColor: ride.vehicleColor || "",
      additionalInfo: ride.additionalInfo || "",
    });
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editingRide?._id) return;
    setEditError("");
    // Light client-side validation
    const seats = Number(editForm.seatsAvailable) || 0;
    if (seats < 1 || seats > 8) {
      setEditError("Seats must be between 1 and 8.");
      return;
    }
    setEditSaving(true);
    try {
      const { data: resp } = await axios.patch(
        `${API_BASE}/api/rides/${editingRide._id}`,
        { ...editForm, phone },
        { timeout: 10000 }
      );
      const updated = resp?.data?.ride;
      // Splice the updated ride back into the list
      setData((d) => {
        if (!d || !Array.isArray(d.rides)) return d;
        return {
          ...d,
          rides: d.rides.map((r) =>
            r._id === editingRide._id ? { ...r, ...editForm, ...(updated || {}) } : r
          ),
        };
      });
      setEditingRide(null);
    } catch (e) {
      console.error("Edit ride failed:", e);
      setEditError(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Could not save your changes."
      );
    } finally {
      setEditSaving(false);
    }
  };

  const unblock = async (id) => {
    // Optimistic remove
    const prev = blocked;
    setBlocked((cur) => cur.filter((u) => u.id !== id));
    try {
      await axios.delete(
        `${API_BASE}/api/users/block/${encodeURIComponent(id)}`,
        { data: { blockerPhone: phone } }
      );
    } catch (e) {
      // Roll back if the API call failed
      console.error("Unblock failed:", e);
      setBlocked(prev);
    }
  };

  // Bumped each time the user clicks "Try again" to force a refetch.
  const [reloadKey, setReloadKey] = useState(0);
  // Flipped to true when the backend rejects us with 401/403 — i.e. the
  // phone in localStorage no longer maps to a valid account. We then
  // render the same big CTA the not-logged-in path uses, but with a
  // headline that explains the session expired (instead of "never
  // signed in"). The stale phone is cleared so the next reload won't
  // immediately fall into the same trap.
  const [sessionExpired, setSessionExpired] = useState(false);

  // Fetch the user's profile + their rides
  useEffect(() => {
    if (!phone) {
      // Not signed in — no network call to make. We render a dedicated
      // logged-out CTA (see below), so we DON'T set `error` here; that
      // would just render a duplicate red banner on top of the CTA.
      setLoading(false);
      setError("");
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setSessionExpired(false);

    axios
      .get(`${API_BASE}/api/rides/by-user`, {
        params: { phone },
        timeout: 12000,
      })
      .then(({ data: resp }) => {
        if (cancelled) return;
        setData(resp?.data || null);
      })
      .catch((err) => {
        if (cancelled) return;

        // Session has expired — backend rejects with 401 or 403, OR the
        // server explicitly tells us the account is unknown. Clear the
        // stale phone, flip the dedicated state, and bail out before the
        // generic error banner runs.
        const status = err?.response?.status;
        const serverMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "";
        if (
          status === 401 ||
          status === 403 ||
          /session.*expired|not.*authoriz|invalid.*token|user.*not.*found/i.test(serverMsg)
        ) {
          try { localStorage.removeItem("phone"); } catch (e) { /* ignore */ }
          setSessionExpired(true);
          setData(null);
          setError("");
          return;
        }
        // Categorise the remaining (non-auth) failures so the banner is
        // helpful rather than a one-liner. The user can act on each:
        //   - timeout  → backend is asleep (Render free tier)
        //   - network  → wrong VITE_APP_URL, offline, or CORS
        //   - 404      → backend missing the /by-user route (old deploy)
        //   - 5xx      → backend crashed; show server's own message
        const isTimeout =
          err?.code === "ECONNABORTED" ||
          err?.code === "ETIMEDOUT" ||
          /timeout/i.test(err?.message || "");
        const isNet =
          err?.code === "ERR_NETWORK" || err?.message === "Network Error";

        let msg;
        if (isTimeout) {
          msg = `The backend at ${API_BASE} didn't respond in time. If it's on Render's free tier it may be waking up — try again in 20–30 seconds.`;
        } else if (isNet) {
          msg = `Could not reach the backend at ${API_BASE}. Make sure the server is running and reachable from this device.`;
        } else if (status === 404) {
          msg = `The backend at ${API_BASE} doesn't have the /api/rides/by-user route. The server needs to be redeployed with the latest code.`;
        } else if (status && status >= 500) {
          msg = `Server error (${status})${serverMsg ? ` — ${serverMsg}` : ""}. Please try again.`;
        } else if (serverMsg) {
          msg = serverMsg;
        } else if (status) {
          msg = `Could not load your profile (HTTP ${status}).`;
        } else {
          msg = "Could not load your profile.";
        }

        setError(msg);
        console.error("[ProfileSettings] fetch failed:", {
          code: err?.code, status, serverMsg, raw: err,
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [phone, reloadKey]);

  const user = data?.user;
  const rides = data?.rides || [];

  // Booked rides aren't tracked separately yet — same Posted list for now
  const bookedRides = rides;

  // Show real user values once loaded; placeholders ONLY when loaded but
  // genuinely empty. While loading we render an em-dash so no fake name
  // ("Akash Kumar" etc.) ever flashes on screen.
  const fullName = loading
    ? ""
    : (user?.fullName?.trim() || "Your Name");
  const email = loading
    ? ""
    : (user?.email?.trim() || "—");
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

      {/* Hero gradient header — hidden while loading so the fallback
          placeholders never flash on screen. Also hidden when the user
          isn't logged in OR their session has expired (we show a
          dedicated CTA instead, further down). */}
      {!loading && !notLoggedIn && !sessionExpired && (
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
          {fmtMember(user?.memberSince)}
        </div>
      </div>
      )}

      {/* Body */}
      <div className="ps-shell" style={{ flex: 1, marginTop: 12 }}>

        {loading && (
          <Spinner label="Loading your profile…" sublabel="Fetching your rides" />
        )}

        {/* Logged-out / session-expired call-to-action — replaces the
            hero + cards when there's either no phone in localStorage
            OR the backend rejected us with 401/403. Both states render
            the same card; only the headline + sub-text differ. */}
        {!loading && (notLoggedIn || sessionExpired) && (
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            boxShadow: "0 2px 12px rgba(15, 15, 46, 0.05)",
            padding: "40px 28px",
            textAlign: "center",
            marginTop: 24,
          }}>
            {/* Generic person silhouette — no initial, no fake name.
                For the session-expired state we tint it amber to nudge
                the user that something changed (vs the neutral "never
                signed in" grey). */}
            <div style={{
              width: 84, height: 84, borderRadius: "50%",
              margin: "0 auto 18px",
              background: sessionExpired
                ? "linear-gradient(135deg,#fef3c7,#fde68a)"
                : "linear-gradient(135deg,#e5e7eb,#f3f4f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "3px solid #fff",
              boxShadow: "0 4px 14px rgba(15,15,46,0.08)",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                   stroke={sessionExpired ? "#b45309" : "#9ca3af"} strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <div style={{
              fontSize: 18, fontWeight: 800, color: "#111827",
              marginBottom: 6, letterSpacing: "-0.3px",
            }}>
              {sessionExpired
                ? "Your session has expired"
                : "You're not signed in"}
            </div>
            <div style={{
              fontSize: 13, color: "#6b7280", lineHeight: 1.5,
              maxWidth: 360, margin: "0 auto 22px",
            }}>
              {sessionExpired
                ? "For your security, you've been logged out. Please log in again to see your profile, your posted rides, and the people you've blocked."
                : "Log in to see your profile, your posted rides, and the people you've blocked."}
            </div>

            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 28px",
                fontSize: 14, fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
              }}
            >
              {sessionExpired ? "Log in again" : "Log in"}
            </button>
          </div>
        )}

        {!loading && !notLoggedIn && !sessionExpired && error && (
          <div style={{
            background: "#fff5f5", border: "1px solid #fecaca",
            color: "#b91c1c", borderRadius: 12, padding: "16px 18px",
            marginBottom: 16,
          }}>
            <div style={{
              fontWeight: 700, fontSize: 14, marginBottom: 6, color: "#991b1b",
            }}>
              Could not load your profile
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55, marginBottom: 12 }}>
              {error}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                style={{
                  background: "#dc2626", color: "#fff", border: "none",
                  borderRadius: 8, padding: "8px 16px",
                  fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Try again
              </button>
              {/* If the error suggests an auth problem, offer to clear
                  the stashed phone and send the user back to /login. */}
              {/expired|log in again/i.test(error) && (
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.removeItem("phone"); } catch (e) { /* ignore */ }
                    navigate("/login");
                  }}
                  style={{
                    background: "#fff", color: "#b91c1c",
                    border: "1px solid #fecaca",
                    borderRadius: 8, padding: "8px 16px",
                    fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Log in again
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !notLoggedIn && !sessionExpired && !error && (
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
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ));
                })()}
              </div>
            </div>

            {/* BLOCKED USERS */}
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

              {/* Safety tip */}
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

      {/* Edit ride modal */}
      {editingRide && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !editSaving && setEditingRide(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 14,
              maxWidth: 460, width: "100%",
              padding: "20px 22px 16px",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
              maxHeight: "90vh", overflowY: "auto",
              fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#111827" }}>Edit ride</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                  {editingRide.from} → {editingRide.to}
                </div>
              </div>
              <button
                type="button"
                onClick={() => !editSaving && setEditingRide(null)}
                aria-label="Close"
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 22, lineHeight: 1, color: "#6b7280", padding: 4,
                }}
              >×</button>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={editLabel}>Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  min={localTodayISO()}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                  style={editInput}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={editLabel}>Time</label>
                <input
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                  style={editInput}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={editLabel}>Available seats</label>
              <input
                type="number"
                min={1}
                max={8}
                value={editForm.seatsAvailable}
                onChange={(e) => setEditForm((f) => ({ ...f, seatsAvailable: Number(e.target.value) || 1 }))}
                style={editInput}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={editLabel}>Vehicle type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Car", "Bike"].map((v) => {
                  const active = editForm.vehicle === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, vehicle: v }))}
                      style={{
                        flex: 1,
                        border: active ? "2px solid #2563eb" : "1.5px solid #e5e7eb",
                        background: active ? "#eff6ff" : "#fff",
                        color: active ? "#1d4ed8" : "#374151",
                        borderRadius: 10, padding: "10px 0",
                        fontSize: 13, fontWeight: 700,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >{v}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={editLabel}>Vehicle name</label>
                <input
                  type="text"
                  value={editForm.vehicleModel}
                  onChange={(e) => setEditForm((f) => ({ ...f, vehicleModel: e.target.value }))}
                  style={editInput}
                  placeholder="e.g. Swift"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={editLabel}>Color</label>
                <input
                  type="text"
                  value={editForm.vehicleColor}
                  onChange={(e) => setEditForm((f) => ({ ...f, vehicleColor: e.target.value }))}
                  style={editInput}
                  placeholder="e.g. White"
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={editLabel}>Notes / preferences</label>
              <textarea
                value={editForm.additionalInfo}
                onChange={(e) => setEditForm((f) => ({ ...f, additionalInfo: e.target.value }))}
                style={{ ...editInput, height: 70, resize: "vertical", paddingTop: 10 }}
                maxLength={500}
                placeholder="e.g. No smoking, music lovers welcome"
              />
            </div>

            {editError && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                color: "#b91c1c", borderRadius: 8, padding: "8px 12px",
                fontSize: 12, marginBottom: 12,
              }}>
                {editError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => !editSaving && setEditingRide(null)}
                disabled={editSaving}
                style={{
                  background: "#fff", color: "#374151",
                  border: "1.5px solid #e5e7eb", borderRadius: 10,
                  padding: "10px 18px", fontSize: 13, fontWeight: 700,
                  cursor: editSaving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >Cancel</button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={editSaving}
                style={{
                  background: editSaving ? "#93c5fd" : "#2563eb",
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "10px 20px", fontSize: 13, fontWeight: 700,
                  cursor: editSaving ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                }}
              >{editSaving ? "Saving..." : "Save changes"}</button>
            </div>
          </div>
        </div>
      )}

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

const editLabel = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 4,
};

const editInput = {
  width: "100%",
  border: "1.5px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  color: "#1a1a2e",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};
