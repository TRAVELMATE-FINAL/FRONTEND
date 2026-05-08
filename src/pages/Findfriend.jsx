import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import RideMap from "../components/RideMap/RideMap";

const API_BASE = import.meta.env.VITE_APP_URL || "http://localhost:5000";

/* ── Inject spinner + shimmer keyframes once per page mount ── */
const SpinnerStyles = () => (
  <style>{`
    @keyframes ff-spin { to { transform: rotate(360deg); } }
    @keyframes ff-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    .ff-spinner-ring {
      width: 56px; height: 56px;
      border-radius: 50%;
      border: 4px solid #e6e8ec;
      border-top-color: #7c3aed;
      animation: ff-spin 0.9s linear infinite;
    }
    .ff-skel {
      background: linear-gradient(90deg, #1f2937 0%, #2a3447 50%, #1f2937 100%);
      background-size: 800px 100%;
      animation: ff-shimmer 1.4s linear infinite;
      border-radius: 8px;
    }
  `}</style>
);

/* ── Professional loading state — spinner + shimmer skeleton cards ── */
const LoadingRides = () => (
  <>
    <SpinnerStyles />
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "26px 0 18px",
    }}>
      <div className="ff-spinner-ring" />
      <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>
        Finding the best rides for you…
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
        Hold tight, this only takes a moment.
      </div>
    </div>

    {/* 3 shimmering skeleton cards so the layout doesn't jump when the data arrives */}
    {[0, 1, 2].map((i) => (
      <div key={i} style={{
        background: "#111827", borderRadius: "20px", padding: "26px",
        display: "flex", gap: "22px",
        border: "1px solid rgba(255,255,255,0.07)",
        opacity: 1 - i * 0.18,
      }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="ff-skel" style={{ width: 60, height: 60, borderRadius: "50%" }} />
            <div style={{ flex: 1 }}>
              <div className="ff-skel" style={{ height: 16, width: "55%", marginBottom: 8 }} />
              <div className="ff-skel" style={{ height: 12, width: "35%" }} />
            </div>
          </div>
          <div className="ff-skel" style={{ height: 22, width: "75%" }} />
          <div className="ff-skel" style={{ height: 14, width: "45%" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <div className="ff-skel" style={{ height: 22, width: 60, borderRadius: 20 }} />
            <div className="ff-skel" style={{ height: 22, width: 70, borderRadius: 20 }} />
            <div className="ff-skel" style={{ height: 22, width: 80, borderRadius: 20 }} />
          </div>
        </div>
        <div className="ff-skel" style={{ width: 210, height: 180, flexShrink: 0, borderRadius: 14 }} />
      </div>
    ))}
  </>
);

/* ── Tag chip ── */
const Tag = ({ label }) => (
  <span style={{
    padding: "4px 13px", borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "#c9d1e0", fontSize: "12px", fontWeight: 500
  }}>{label}</span>
);

/* ── Live ride card — bigger card, real driver name + photo, larger map ── */
const RideCard = ({ ride, onConnect }) => {
  const driver  = ride.driverName?.trim() || "TravelMate Rider";
  const photo   = ride.driverPhoto || "";
  const initial = driver.charAt(0).toUpperCase();
  const tags = [
    ride.gender || "Any",
    ride.vehicle || "Bike",
    ...(ride.distance ? [`📍 ${ride.distance}`] : []),
  ];
  const seats = typeof ride.seatsAvailable === "number" ? ride.seatsAvailable : 1;
  const isFresh = ride.createdAt &&
    Date.now() - new Date(ride.createdAt).getTime() < 10 * 60 * 1000;

  return (
    <div style={{
      background: "#111827", borderRadius: "20px", padding: "26px",
      display: "flex", flexDirection: "column", gap: "18px",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 4px 22px rgba(15,15,46,0.10)"
    }}>
      <div style={{ display: "flex", gap: "22px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
          {/* Driver — real name + uploaded photo if any */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "60px", height: "60px", borderRadius: "50%", flexShrink: 0,
              border: "2px solid rgba(255,255,255,0.18)", overflow: "hidden",
              background: photo ? "#1f2937" : "linear-gradient(135deg,#6366f1,#a78bfa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "22px"
            }}>
              {photo
                ? <img src={photo} alt={driver} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <span style={{ color: "#f1f3f5", fontWeight: 700, fontSize: "18px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{driver}</span>
                <span style={{ background: "#2f9e44", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 9 9"><polyline points="1.5,4.5 3.5,6.5 7.5,2.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
              <div style={{ color: "#9ca3af", fontSize: "13px", marginTop: "3px" }}>
                <span style={{ color: "#f59f00" }}>★ 4.8</span> &bull; {ride.duration || "—"}
                {isFresh && <span style={{ color: "#4ade80", fontWeight: 600, marginLeft: 8 }}>🟢 Just posted</span>}
              </div>
            </div>
          </div>

          <div style={{ color: "#f1f3f5", fontWeight: 700, fontSize: "20px" }}>
            {ride.from} → {ride.to}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#cbd5e1", fontSize: "14px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {ride.date || ""} &bull; {ride.time || ""}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {tags.map((t, i) => <Tag key={i} label={t} />)}
          </div>
        </div>

        {/* Bigger Leaflet map — real driving polyline */}
        <div style={{ width: "210px", height: "180px", flexShrink: 0, borderRadius: "14px", overflow: "hidden" }}>
          <RideMap ride={ride} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f1f3f5", fontSize: "14px", fontWeight: 600 }}>
            <span>🔥</span> {seats} {seats === 1 ? "seat" : "seats"} left
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
            </svg>
            {ride.viewCount || 0} people viewed
          </div>
        </div>
        <button
          onClick={() => onConnect(ride._id)}
          style={{
            background: "#e8b800", color: "#111", border: "none",
            borderRadius: "26px", padding: "13px 28px",
            fontWeight: 700, fontSize: "15px", cursor: "pointer",
            boxShadow: "0 4px 14px rgba(232, 184, 0, 0.30)"
          }}>Connect →</button>
      </div>
    </div>
  );
};

/* ── Filter panel — controlled by parent so filters actually affect the list ── */
const FilterPanel = ({ filters, setFilters, onApply, onReset }) => {
  const { vehicleType = "", femaleOnly = false, departTime, amenity, minSeats } = filters;
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  // Are any filters currently active? (so we can grey-out / hide the Clear chip)
  const anyActive =
    vehicleType !== "" ||
    femaleOnly ||
    (departTime && departTime !== "") ||
    (amenity && amenity !== "") ||
    (minSeats && minSeats > 0);

  return (
    <div style={{
      background: "#fff", borderRadius: "16px", padding: "20px",
      width: "215px", flexShrink: 0,
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
    }}>
      {/* Header — Filters title + Clear All chip */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "16px", gap: 8,
      }}>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#111", display: "flex", alignItems: "center", gap: "7px" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          Filters
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!anyActive}
          style={{
            background: anyActive ? "#fff5f5" : "#f5f5f5",
            border: "1px solid " + (anyActive ? "#fecaca" : "#e5e5e5"),
            color: anyActive ? "#dc2626" : "#aaa",
            fontSize: "11px", fontWeight: 600,
            padding: "4px 10px", borderRadius: "12px",
            cursor: anyActive ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: "4px",
            fontFamily: "inherit",
          }}
          title={anyActive ? "Clear all filters" : "No filters applied"}
        >
          <span style={{ fontSize: 13, lineHeight: 1 }}>×</span>
          Clear
        </button>
      </div>

      {/* Ride Type — Car or Bike (single-select), independent Female Rider toggle.
          Car + Female / Bike + Female combinations are valid. */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#666", marginBottom: "8px" }}>Ride Type</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[
            { key: "car",  label: "Car",  icon: "🚗" },
            { key: "bike", label: "Bike", icon: "🏍️" },
          ].map(({ key, label, icon }) => {
            const active = vehicleType === key;
            const accent = "#1a1a2e";
            return (
              <button
                key={key}
                type="button"
                onClick={() => set({ vehicleType: active ? "" : key })}
                style={{
                  display: "flex", alignItems: "center", gap: "7px",
                  padding: "7px 12px", borderRadius: "20px", width: "100%",
                  border: active ? `1.5px solid ${accent}` : "1.5px solid transparent",
                  background: active ? accent : "#f0f0f0",
                  color: active ? "#fff" : "#555",
                  fontSize: "12px", fontWeight: 600, cursor: "pointer", textAlign: "left"
                }}>
                <span>{icon}</span>
                <span>{label}</span>
                {active && <span style={{ marginLeft: "auto" }}>✓</span>}
              </button>
            );
          })}

          {/* Female Rider — independent toggle (combinable with Car/Bike) */}
          <button
            type="button"
            onClick={() => set({ femaleOnly: !femaleOnly })}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "7px 12px", borderRadius: "20px", width: "100%",
              border: femaleOnly ? "1.5px solid #ec4899" : "1.5px solid transparent",
              background: femaleOnly ? "#ec4899" : "#f0f0f0",
              color: femaleOnly ? "#fff" : "#555",
              fontSize: "12px", fontWeight: 600, cursor: "pointer", textAlign: "left",
              marginTop: 4,
            }}
          >
            <span>👩</span>
            <span>Female Rider</span>
            {femaleOnly && <span style={{ marginLeft: "auto" }}>✓</span>}
          </button>
        </div>

        {/* Combination hint */}
        {(vehicleType || femaleOnly) && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 8, lineHeight: 1.4 }}>
            Showing: {[
              vehicleType === "car"  ? "🚗 Car"   : null,
              vehicleType === "bike" ? "🏍️ Bike" : null,
              femaleOnly             ? "👩 Female" : null,
            ].filter(Boolean).join(" + ")}
          </div>
        )}
      </div>

      {/* Departure time — actual time picker */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#666", marginBottom: "8px" }}>Departure time</div>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          border: "1.5px solid #e5e5e5", borderRadius: "10px",
          padding: "8px 12px", background: "#fff"
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <input
            type="time"
            value={departTime}
            onChange={(e) => set({ departTime: e.target.value })}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: "13px", color: "#1a1a2e", fontFamily: "inherit",
              flex: 1, minWidth: 0
            }}
          />
          {departTime && (
            <button type="button" onClick={() => set({ departTime: "" })} title="Clear"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 16, padding: 0 }}>
              ×
            </button>
          )}
        </div>
        <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>Shows rides at or after this time</div>
      </div>

      {/* Amenities — pick any one (radio behaviour, click again to clear) */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#666", marginBottom: "8px" }}>Amenities</div>
        {[
          { key: "smoking", label: "Smoking Allowed" },
          { key: "pets",    label: "Pets Allowed" },
        ].map(({ key, label }) => {
          const active = amenity === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => set({ amenity: active ? "" : key })}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", padding: "6px 4px", marginBottom: "4px",
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: "12px", color: "#333", textAlign: "left",
                fontFamily: "inherit"
              }}>
              <div style={{
                width: "16px", height: "16px", borderRadius: "50%",
                border: `2px solid ${active ? "#2f9e44" : "#cfcfcf"}`,
                background: active ? "#2f9e44" : "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "all 0.15s ease"
              }}>
                {active && (
                  <svg width="9" height="9" viewBox="0 0 9 9">
                    <polyline points="1.5,4.5 3.5,6.5 7.5,2.5" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {label}
            </button>
          );
        })}
      </div>

      {/* Minimum Seats — number box (Figma-style) */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#666", marginBottom: "10px" }}>Minimum Seats</div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          border: "1.5px solid #e5e5e5", borderRadius: "10px",
          padding: "8px 12px", background: "#fff"
        }}>
          <input
            type="number"
            min={0}
            max={8}
            value={minSeats}
            onChange={(e) => set({ minSeats: Math.max(0, Math.min(8, Number(e.target.value) || 0)) })}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: "16px", fontWeight: 700, color: "#1a1a2e",
              width: "40px", textAlign: "left",
              fontFamily: "inherit"
            }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <button type="button" onClick={() => set({ minSeats: Math.max(0, minSeats - 1) })} style={{
              width: "26px", height: "26px", borderRadius: "8px",
              border: "1.5px solid #e5e5e5", background: "#fff",
              cursor: "pointer", fontSize: "14px", color: "#555",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>−</button>
            <button type="button" onClick={() => set({ minSeats: Math.min(8, minSeats + 1) })} style={{
              width: "26px", height: "26px", borderRadius: "8px",
              border: "none", background: "#1a1a2e",
              cursor: "pointer", fontSize: "14px", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>+</button>
          </div>
        </div>
      </div>

      {/* Round dark search button (Figma style) */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button type="button" onClick={onApply} title="Apply filters" style={{
          background: "#1a1a2e", color: "#fff", border: "none",
          borderRadius: "50%", width: "42px", height: "42px",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(26,26,46,0.25)"
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* ── Main ── */
export default function TravelMate() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryFrom = searchParams.get("from") || "";
  const queryTo   = searchParams.get("to")   || "";
  const queryDate = searchParams.get("date") || "";

  // Default the search-bar date to TODAY when the URL doesn't carry one,
  // so the FindFriends top bar always shows a valid date out of the box.
  const todayISO = () => new Date().toISOString().split("T")[0];

  const [from, setFrom] = useState(queryFrom);
  const [to,   setTo]   = useState(queryTo);
  const [date, setDate] = useState(queryDate || todayISO());

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Sidebar filters (applied client-side to the rides list)
  // vehicleType + femaleOnly are independent — they combine with AND.
  const [filters, setFilters] = useState({
    vehicleType: "",     // "" | "car" | "bike"
    femaleOnly: false,   // true = require Female rider
    departTime: "",      // "" or "HH:MM" (rides ≥ this time)
    amenity: "",         // "" | "smoking" | "pets"
    minSeats: 0,
  });
  const resetFilters = () =>
    setFilters({ vehicleType: "", femaleOnly: false, departTime: "", amenity: "", minSeats: 0 });

  // The round Search button just scrolls to the top of the cards list
  const applyFilters = () => {
    const cards = document.getElementById("ff-cards");
    if (cards) cards.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Apply filters
  const matchesAmenity = (info, amenity) => {
    const t = (info || "").toLowerCase();
    if (!amenity) return true;
    if (amenity === "smoking") return t.includes("smoking") && !t.includes("no smoking");
    if (amenity === "pets")    return t.includes("pet");
    return true;
  };
  const visibleRides = rides.filter((r) => {
    const v = (r.vehicle || "").toLowerCase();
    const g = (r.gender || "").toLowerCase();

    // Vehicle filter — single-select Car or Bike (independent of femaleOnly)
    if (filters.vehicleType === "car"  && v !== "car")  return false;
    if (filters.vehicleType === "bike" && v !== "bike") return false;

    // Female-only — independent toggle, combines with Car/Bike via AND
    if (filters.femaleOnly && g !== "female") return false;

    if (filters.departTime && (r.time || "") < filters.departTime) return false;
    if (!matchesAmenity(r.additionalInfo, filters.amenity)) return false;
    if (filters.minSeats > 0 && (r.seatsAvailable || 0) < filters.minSeats) return false;
    return true;
  });

  // Fetch — search if from+to in URL, else all rides
  const fetchRides = async () => {
    try {
      setLoading(true); setError(""); setNotFound(false);
      let url = `${API_BASE}/api/rides`;
      if (queryFrom && queryTo) {
        const qp = new URLSearchParams({ from: queryFrom, to: queryTo });
        url = `${API_BASE}/api/rides/search?${qp.toString()}`;
      }
      const { data } = await axios.get(url);
      setRides(data.data || []);
      if (queryFrom && queryTo && (!data.data || data.data.length === 0)) {
        setNotFound(true);
      }
    } catch {
      setError("Could not load rides. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on URL change + auto-refresh every 15s
  useEffect(() => {
    setFrom(queryFrom); setTo(queryTo); setDate(queryDate);
    fetchRides();
    const id = setInterval(fetchRides, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFrom, queryTo, queryDate]);

  // Submit search bar → write URL params
  const handleSearch = (e) => {
    e?.preventDefault?.();
    const f = from.trim(), t = to.trim();
    if (!f || !t) {
      // empty → clear filter, show all
      setSearchParams({});
      return;
    }
    if (f.toLowerCase() === t.toLowerCase()) {
      alert("'From' and 'To' cannot be the same");
      return;
    }
    const params = { from: f, to: t };
    if (date) params.date = date;
    setSearchParams(params);
  };

  const clearFilter = () => {
    setFrom(""); setTo(""); setDate("");
    setSearchParams({});
  };

  return (
    <div className="ff-page" style={{ minHeight: "100vh", background: "#dde1e9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Navbar ── */}
      <div style={{ background: "#fff", padding: "0 48px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div onClick={() => navigate("/")} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.8" />
              <polygon points="12,4 14.5,11 12,10 9.5,11" fill="white" />
              <polygon points="12,20 9.5,13 12,14 14.5,13" fill="rgba(255,255,255,0.5)" />
              <circle cx="12" cy="12" r="1.5" fill="white" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: "18px", color: "#111", letterSpacing: "-0.4px" }}>Travel Mate</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button onClick={() => navigate("/login")} style={{ background: "#e8b800", color: "#111", border: "none", borderRadius: "22px", padding: "9px 24px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>Login</button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <form onSubmit={handleSearch} style={{ padding: "28px 48px 0", display: "flex", justifyContent: "center" }}>
        <div style={{
          background: "#c8cdd8",
          borderRadius: "16px",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          maxWidth: "740px"
        }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "11px 14px", display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <input value={from} onChange={e => setFrom(e.target.value)} placeholder="From"
              style={{ border: "none", outline: "none", fontSize: "14px", color: "#333", width: "100%", background: "transparent" }} />
          </div>

          <div style={{ background: "#fff", borderRadius: "10px", padding: "11px 14px", display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="To"
              style={{ border: "none", outline: "none", fontSize: "14px", color: "#333", width: "100%", background: "transparent" }} />
          </div>

          <div style={{ background: "#fff", borderRadius: "10px", padding: "11px 14px", display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={e => setDate(e.target.value)}
              placeholder="Date"
              style={{ border: "none", outline: "none", fontSize: "14px", color: "#333", width: "100%", background: "transparent" }} />
          </div>

          <button type="submit" style={{
            background: "#e8b800", color: "#111", border: "none",
            borderRadius: "10px", padding: "11px 22px",
            fontWeight: 700, fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0
          }}>Find Ride</button>
        </div>
      </form>

      {/* Active filter chip */}
      {(queryFrom || queryTo) && (
        <div style={{ padding: "12px 48px 0", display: "flex", justifyContent: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#fff", borderRadius: 14, padding: "10px 16px",
            border: "1px solid #e5e7eb",
            fontSize: 13, color: "#1a1a2e", fontWeight: 500,
            maxWidth: 875, width: "100%",
          }}>
            <div>
              Showing rides from <b>{queryFrom}</b> to <b>{queryTo}</b>
              {queryDate && <> on <b>{queryDate}</b></>}
            </div>
            <button onClick={clearFilter} style={{
              background: "transparent", border: "none", color: "#7c3aed",
              fontWeight: 600, cursor: "pointer", fontSize: 13,
            }}>Clear filter</button>
          </div>
        </div>
      )}

      {/* Body — filter panel + cards list */}
      <div style={{
        padding: "20px 48px 60px",
        display: "flex", gap: "20px",
        justifyContent: "center",
        alignItems: "flex-start"
      }}>
        <FilterPanel filters={filters} setFilters={setFilters} onApply={applyFilters} onReset={resetFilters} />
        <div id="ff-cards" style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, maxWidth: "640px" }}>
          {loading && <LoadingRides />}

          {!loading && error && (
            <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 12, padding: 16, textAlign: "center" }}>
              {error}
            </div>
          )}

          {!loading && !error && notFound && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 12, padding: 24, textAlign: "center", lineHeight: 1.7 }}>
              No rides found for this route.
            </div>
          )}

          {!loading && !error && !notFound && rides.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#475569", fontSize: 14 }}>
              No rides yet — be the first to post one!
            </div>
          )}

          {!loading && !error && rides.length > 0 && visibleRides.length === 0 && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 12, padding: 24, textAlign: "center", lineHeight: 1.7 }}>
              No rides match the current filters.{" "}
              <button onClick={resetFilters} style={{ background: "transparent", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer" }}>Reset filters</button>
            </div>
          )}

          {!loading && !error && visibleRides.map((ride) => (
            <RideCard
              key={ride._id}
              ride={ride}
              onConnect={(id) => navigate(`/connect-unlock?rideId=${id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
