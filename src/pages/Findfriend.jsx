import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import RideMap from "../components/RideMap/RideMap";
import LocationSearch from "../components/LocationSearch/LocationSearch";
import Spinner from "../components/Spinner/Spinner.jsx";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import { formatTime12h } from "../utils/time.js";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

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

/* ── Lightweight loading state — shared Spinner + 1 thin skeleton card ── */
const LoadingRides = () => (
  <>
    <SpinnerStyles />
    <Spinner
      label="Finding the best rides for you…"
      sublabel="Hold tight, this only takes a moment."
    />

    {/* Single light skeleton card so the layout doesn't jump when data arrives.
        Three heavy skeletons + map placeholders were too much paint work and made
        the page feel sluggish on slow networks. */}
    <div style={{
      background: "#111827", borderRadius: "20px", padding: "20px",
      display: "flex", gap: "18px",
      border: "1px solid rgba(255,255,255,0.07)",
      opacity: 0.7,
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="ff-skel" style={{ width: 48, height: 48, borderRadius: "50%" }} />
          <div style={{ flex: 1 }}>
            <div className="ff-skel" style={{ height: 14, width: "55%", marginBottom: 6 }} />
            <div className="ff-skel" style={{ height: 10, width: "35%" }} />
          </div>
        </div>
        <div className="ff-skel" style={{ height: 18, width: "75%" }} />
        <div className="ff-skel" style={{ height: 12, width: "45%" }} />
      </div>
    </div>
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

/* ── Live ride card — Figma redesign (template only; same data + logic) ── */
const RideCard = ({ ride, onConnect }) => {
  const driver  = ride.driverName?.trim() || "TravelMate Rider";
  const photo   = ride.driverPhoto || "";
  const initial = driver.charAt(0).toUpperCase();
  // Show whatever the driver typed in the "Notes & preferences" field
  // when publishing the ride (additionalInfo). Split on commas /
  // newlines so they render as separate pills. When the driver didn't
  // add any notes, we render nothing here — no hardcoded defaults.
  const tagsRaw = (() => {
    const note = (ride.additionalInfo || "").trim();
    if (!note) return [];
    return note
      .split(/[,\n]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  })();
  const seats = typeof ride.seatsAvailable === "number" ? ride.seatsAvailable : 1;
  // "30 Apr • 06:00 AM" — same field values, more compact rendering
  const dateLabel = (() => {
    if (!ride.date) return "";
    const d = new Date(ride.date);
    if (isNaN(d.getTime())) return ride.date;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  })();

  return (
    <div className="ff-ride-card" style={{
      background: "#1c1c3d",            // deep indigo to match Figma
      borderRadius: "22px",
      padding: "22px 24px 20px",
      display: "flex", flexDirection: "column", gap: "16px",
      boxShadow: "0 6px 26px rgba(15, 15, 46, 0.12)",
    }}>
      <div className="ff-ride-row" style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
          {/* Driver row — avatar + name + green tick + rating · rides */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
              overflow: "hidden",
              background: photo ? "#1f2937" : "linear-gradient(135deg,#6366f1,#a78bfa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "17px",
            }}>
              {photo
                ? <img src={photo} alt={driver} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "17px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{driver}</span>
                {/* Green verified tick — same as Figma */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" fill="#22c55e" />
                  <polyline points="4.5,8 7,10.5 11.5,5.5" stroke="white" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ color: "#a5acc4", fontSize: "13px", marginTop: 1, fontWeight: 500 }}>
                ★ 4.9 &nbsp;•&nbsp; {ride.viewCount ? ride.viewCount : 45} rides
              </div>
            </div>
          </div>

          {/* Route — bold white */}
          <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "22px", letterSpacing: "-0.2px" }}>
            {ride.from} → {ride.to}
          </div>

          {/* Yellow date / time line */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f5c518", fontSize: "15px", fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {dateLabel} &nbsp;•&nbsp; {formatTime12h(ride.time)}
          </div>

          {/* Tag pills — only when the driver wrote a note while
              publishing. No hardcoded defaults. */}
          {tagsRaw.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {tagsRaw.slice(0, 5).map((t, i) => (
                <span key={i} style={{
                  background: "#2b2b50",
                  color: "#d6dafc",
                  fontSize: 12, fontWeight: 600,
                  padding: "5px 14px",
                  borderRadius: 999,
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Map preview on the right */}
        <div className="ff-ride-map" style={{
          width: "220px", height: "200px", flexShrink: 0,
          borderRadius: "14px", overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <RideMap ride={ride} />
        </div>
      </div>

      {/* Footer row — 🔥 seats left + 👁 viewers + Connect button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "8px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f5c518", fontSize: 14, fontWeight: 700 }}>
            <span>🔥</span> {seats} {seats === 1 ? "seat" : "seats"} left
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7d83a3", fontSize: 12, marginTop: 6, fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7d83a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {ride.viewCount || 0} people viewing
          </div>
        </div>
        <button
          onClick={() => onConnect(ride._id)}
          style={{
            background: "#f5c518", color: "#111", border: "none",
            borderRadius: "28px", padding: "13px 28px",
            fontWeight: 700, fontSize: "15px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 6px 18px rgba(245, 197, 24, 0.35)",
            fontFamily: "inherit",
          }}>
          Connect <span style={{ fontSize: 17, lineHeight: 1 }}>→</span>
        </button>
      </div>
    </div>
  );
};

/* ── Custom 12-hour time picker (Hour / Minute / AM-PM) ──────────
   The native <input type="time"> shows 24h on some OS locales, so we
   use three pill-style dropdowns. Internally we still emit "HH:MM" in
   24h form so the existing filter / sort logic keeps working. */
function Time12hPicker({ value, onChange }) {
  const parsed = (() => {
    const [hStr = "", mStr = "00"] = String(value || "").split(":");
    const h24 = parseInt(hStr, 10);
    const m   = parseInt(mStr, 10);
    if (Number.isNaN(h24)) return { h12: "", min: "", ap: "AM" };
    const ap  = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { h12: String(h12), min: String(Number.isNaN(m) ? 0 : m).padStart(2, "0"), ap };
  })();

  const emit = (h12, mm, ap) => {
    if (!h12 || mm === "") { onChange(""); return; }
    let h = parseInt(h12, 10);
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const out = String(h).padStart(2, "0") + ":" + String(parseInt(mm, 10)).padStart(2, "0");
    onChange(out);
  };

  const selectStyle = {
    border: "none", outline: "none",
    background: "transparent",
    fontFamily: "inherit",
    fontSize: 13, color: "#1a1a2e",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    paddingRight: 4,
    fontWeight: 600,
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      border: "1px solid #e5e7eb", borderRadius: 999,
      padding: "10px 14px", background: "#fff",
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
      <select aria-label="Hour" value={parsed.h12}
        onChange={(e) => emit(e.target.value, parsed.min || "00", parsed.ap)}
        style={selectStyle}>
        <option value="">--</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>{String(h).padStart(2, "0")}</option>
        ))}
      </select>
      <span style={{ fontWeight: 700, color: "#1a1a2e" }}>:</span>
      <select aria-label="Minutes" value={parsed.min}
        onChange={(e) => emit(parsed.h12 || "12", e.target.value, parsed.ap)}
        style={selectStyle}>
        <option value="">--</option>
        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
          <option key={m} value={String(m).padStart(2, "0")}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
      <select aria-label="AM or PM" value={parsed.ap}
        onChange={(e) => emit(parsed.h12 || "12", parsed.min || "00", e.target.value)}
        style={{ ...selectStyle, fontWeight: 700 }}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

/* ── Filter panel — Figma redesign (template only; same data + logic) ── */
const FilterPanel = ({ filters, setFilters, onApply, onReset }) => {
  const { vehicleType = "", femaleOnly = false, departTime, amenity, minSeats } = filters;
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const anyActive =
    vehicleType !== "" || femaleOnly ||
    (departTime && departTime !== "") ||
    (amenity && amenity !== "") ||
    (minSeats && minSeats > 0);

  // Inline section heading helper — keeps Figma's vertical rhythm
  const sectionLabel = {
    fontSize: 13, fontWeight: 600, color: "#1a1a2e",
    marginBottom: 10, marginTop: 0,
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: "20px",
      padding: "22px 22px 24px",
      width: "260px",
      flexShrink: 0,
      boxShadow: "0 4px 24px rgba(15, 15, 46, 0.06)",
      border: "1px solid #eef0f4",
    }}>
      {/* Header row — funnel + "Filters" + Clear (always visible) */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "18px", gap: 8,
      }}>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a2e", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
        </div>
        <button type="button" onClick={onReset} style={{
          background: "transparent", border: "none",
          color: anyActive ? "#7c3aed" : "#9ca3af",
          fontSize: 12, fontWeight: 600,
          cursor: "pointer", padding: 0, fontFamily: "inherit",
        }}>
          Clear filter
        </button>
      </div>

      {/* ── Ride Type — horizontal Car | Bike pills ─────────────── */}
      <div style={{ marginBottom: "18px" }}>
        <div style={sectionLabel}>Ride Type</div>
        <div style={{
          display: "flex", gap: 6,
          background: "#f3f4f6", padding: 4, borderRadius: 999,
        }}>
          {[
            { key: "car",  label: "Car",  icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11l1.4-3.7A2 2 0 0 1 8.3 6h7.4a2 2 0 0 1 1.9 1.3L19 11h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H19a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H4.5a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1H5zm2-1h10l-1-2.7a.5.5 0 0 0-.5-.3H8.5a.5.5 0 0 0-.5.3L7 10zm.5 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>
              ) },
            { key: "bike", label: "Bike", icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5.5 18a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm13 2a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM14 6h3a1 1 0 0 1 0 2h-2.4l1.6 3.2 1.3 2A4.5 4.5 0 1 0 19.4 14h-1.66l-3-6L13.1 6H14zM11 9h-.74L9.2 11H7a4.5 4.5 0 1 0 1.4 1.55L9.94 10H12l-1-1z"/></svg>
              ) },
          ].map(({ key, label, icon }) => {
            const active = vehicleType === key;
            return (
              <button key={key} type="button"
                onClick={() => set({ vehicleType: active ? "" : key })}
                style={{
                  flex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  background: active ? "#1a1a2e" : "transparent",
                  color: active ? "#fff" : "#6b7280",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                {icon}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Female Rider — standalone centred pill ──────────────── */}
      <div style={{ marginBottom: "18px", display: "flex", justifyContent: "center" }}>
        <button type="button"
          onClick={() => set({ femaleOnly: !femaleOnly })}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 18px",
            borderRadius: 999,
            border: "1px solid " + (femaleOnly ? "#ec4899" : "#e5e7eb"),
            background: femaleOnly ? "#ec4899" : "#ffffff",
            color: femaleOnly ? "#fff" : "#1a1a2e",
            fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M12 13v8M8 18h8" />
          </svg>
          Female Rider
        </button>
      </div>

      {/* ── Departure time — custom 12h picker (HH : MM AM/PM) ─── */}
      <div style={{ marginBottom: "18px" }}>
        <div style={sectionLabel}>Departure time</div>
        <Time12hPicker
          value={departTime}
          onChange={(v) => set({ departTime: v })}
        />
      </div>

      {/* ── Amenities — round icon chips (Figma) ─────────────────
            Each option sits inside a small round colored circle that
            holds the cigarette / paw glyph. The whole row is clickable
            and the circle goes solid-navy + lifts when active. */}
      <div style={{ marginBottom: "20px" }}>
        <div style={sectionLabel}>Amenities</div>
        {[
          {
            key: "smoking",
            label: "Smoking Allowed",
            tint: "#fef2f2",       // soft red tile inactive
            iconColor: "#ef4444",  // red cigarette glyph
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="2"  y="14" width="14" height="4" rx="1" />
                <rect x="18" y="14" width="2"  height="4" rx="0.5" />
                <path d="M17 11a3 3 0 0 1-3-3V5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M20 11a3 3 0 0 0-3-3"   stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            key: "pets",
            label: "Pets Allowed",
            tint: "#fff7ed",       // soft amber tile inactive
            iconColor: "#f59e0b",  // amber paw glyph
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5"  cy="10" r="1.8" />
                <circle cx="9"  cy="6"  r="1.8" />
                <circle cx="15" cy="6"  r="1.8" />
                <circle cx="19" cy="10" r="1.8" />
                <path d="M12 11c-2.6 0-5 2-5 4.6 0 1.6 1.2 2.9 2.8 2.9.8 0 1.4-.3 2.2-.3s1.4.3 2.2.3c1.6 0 2.8-1.3 2.8-2.9 0-2.6-2.4-4.6-5-4.6z" />
              </svg>
            ),
          },
        ].map(({ key, label, tint, iconColor, icon }) => {
          const active = amenity === key;
          return (
            <button key={key} type="button"
              onClick={() => set({ amenity: active ? "" : key })}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "8px 0",
                background: "transparent", border: "none", cursor: "pointer",
                fontSize: 13, color: "#1a1a2e", textAlign: "left",
                fontFamily: "inherit",
              }}>
              {/* Round icon tile */}
              <span style={{
                width: 32, height: 32, borderRadius: "50%",
                background: active ? "#1a1a2e" : tint,
                color: active ? "#ffffff" : iconColor,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                border: active ? "2px solid #1a1a2e" : "1px solid " + tint,
                boxShadow: active ? "0 2px 6px rgba(26,26,46,0.18)" : "none",
                transition: "all 0.15s",
              }}>
                {icon}
              </span>
              <span style={{ flex: 1, fontWeight: active ? 700 : 500 }}>{label}</span>
              {/* Tiny purple check on the right when selected */}
              {active && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="7" fill="#7c3aed" />
                  <polyline points="3.5,7 6,9.5 10.5,4.5" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Minimum Seats — inline stepper ──────────────────────── */}
      <div style={{ marginBottom: "22px" }}>
        <div style={sectionLabel}>Minimum Seats</div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8,
        }}>
          <button type="button"
            onClick={() => set({ minSeats: Math.max(0, minSeats - 1) })}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              border: "none", background: "#1a1a2e",
              color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, fontFamily: "inherit",
              boxShadow: "0 2px 6px rgba(26,26,46,0.2)",
            }}>−</button>
          <div style={{
            minWidth: 56, padding: "8px 16px",
            background: "#1a1a2e", color: "#fff",
            borderRadius: 999, textAlign: "center",
            fontSize: 14, fontWeight: 700,
          }}>{minSeats || 1}</div>
          <button type="button"
            onClick={() => set({ minSeats: Math.min(8, (minSeats || 0) + 1) })}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              border: "none", background: "#1a1a2e",
              color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, fontFamily: "inherit",
              boxShadow: "0 2px 6px rgba(26,26,46,0.2)",
            }}>+</button>
        </div>
      </div>

      {/* Round dark search button at the bottom — same as Figma */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button type="button" onClick={onApply} title="Apply filters" style={{
          background: "#1a1a2e", color: "#fff", border: "none",
          borderRadius: "50%", width: "52px", height: "52px",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 18px rgba(26,26,46,0.28)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

  // ── Auth + profile check before connecting to a ride ────────────────
  // Returns true if the user is logged in AND has a complete profile.
  // If either condition fails, stashes the rideId and routes the user
  // through /login → /otp → /profile-setup → /findrideplan (chain is
  // driven by pendingUnlockRideId breadcrumb set here).
  const handleConnect = async (rideId) => {
    const phone = localStorage.getItem("phone") || "";
    const phoneLooksValid = /^\+?\d{10,13}$/.test(phone);

    // ── Step 1: Not logged in → send to login ──
    if (!phoneLooksValid) {
      try { localStorage.setItem("pendingUnlockRideId", rideId); } catch (e) {}
      navigate("/login");
      return;
    }

    // ── Step 2: Logged in — check profile completeness ──
    try {
      const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";
      const r = await axios.get(
        `${API_BASE}/api/auth/profile?phone=${encodeURIComponent(phone)}`,
        { timeout: 6000 }
      );
      const u = r?.data?.user || r?.data || {};
      const hasProfile = !!(u.fullName && u.city);

      if (!hasProfile) {
        // Logged in but profile incomplete → set up profile first, then plan
        try { localStorage.setItem("pendingUnlockRideId", rideId); } catch (e) {}
        navigate("/profile-setup");
        return;
      }
    } catch (e) {
      // Profile check failed → route through login to be safe
      try { localStorage.setItem("pendingUnlockRideId", rideId); } catch (e2) {}
      navigate("/login");
      return;
    }

    // ── Step 3: Logged in + profile complete → go straight to plan ──
    try { localStorage.setItem("pendingUnlockRideId", rideId); } catch (e) {}
    navigate(`/findrideplan?rideId=${rideId}`);
  };

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

    // Date filter — show only rides on the chosen day. Picks up the date
    // from the search bar (URL ?date=) so users can browse rides for a
    // specific date the same way they'd filter by anything else.
    if (date && r.date && r.date !== date) return false;

    return true;
  });

  // Mirror URL params back into local state whenever they change so
  // the search-bar inputs reflect the active query (e.g. when the user
  // navigates here from another page with ?from=…&to=…&date=…).
  useEffect(() => {
    setFrom(queryFrom);
    setTo(queryTo);
    setDate(queryDate || todayISO());
  }, [queryFrom, queryTo, queryDate]);

  // Fetch rides ONLY when the user has actually clicked Find Ride —
  // detected by the presence of AT LEAST one filter (from / to / date)
  // in the URL. From-only, To-only, Date-only and any combination all
  // work. With nothing in the URL we render a "fill the form and tap
  // Find Ride" empty state instead of hammering the API.
  // 8-second axios timeout + 10-second safety timer so the spinner
  // can never get stuck if the backend hangs.
  useEffect(() => {
    const hasAnyFilter = !!(queryFrom || queryTo || queryDate);
    if (!hasAnyFilter) {
      // No search yet — clear any previous results and bail out
      setRides([]);
      setLoading(false);
      setError("");
      setNotFound(false);
      return;
    }

    let cancelled = false;
    const ctrl = new AbortController();

    setLoading(true);
    setError("");
    setNotFound(false);

    const safetyTimer = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
      setError((cur) =>
        cur || "Backend is taking too long to respond. Please try again."
      );
    }, 10000);

    const qp = new URLSearchParams();
    if (queryFrom) qp.set("from", queryFrom);
    if (queryTo)   qp.set("to",   queryTo);
    if (queryDate) qp.set("date", queryDate);
    const url = `${API_BASE}/api/rides/search?${qp.toString()}`;

    axios
      .get(url, { timeout: 8000, signal: ctrl.signal })
      .then(({ data }) => {
        if (cancelled) return;
        setRides(data?.data || []);
        if (!data?.data || data.data.length === 0) {
          setNotFound(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isCancel(err)) return;
        const isTimeout =
          err?.code === "ECONNABORTED" || err?.message?.includes("timeout");
        const isNetworkDown =
          err?.code === "ERR_NETWORK" || err?.message === "Network Error";
        const status = err?.response?.status;
        const apiMsg = err?.response?.data?.message || err?.response?.data?.error;

        let msg;
        if (isTimeout) {
          msg = `Server at ${API_BASE} is taking too long. If it's hosted on Render free-tier it may be cold-starting — try again in 15s.`;
        } else if (isNetworkDown) {
          msg = `Could not reach the backend at ${API_BASE}. Make sure the server is running (cd server && node server.js) and that VITE_APP_URL in client/.env points to it.`;
        } else if (status >= 500) {
          msg = `Server error (HTTP ${status}): ${apiMsg || "check the backend terminal for details"}.`;
        } else if (apiMsg) {
          msg = `${apiMsg}${status ? ` (HTTP ${status})` : ""}`;
        } else {
          msg = `Could not load rides${status ? ` (HTTP ${status})` : ""}. URL: ${url}`;
        }
        setError(msg);
        // Also log full error to console so you can inspect it in DevTools
        console.error("[Findfriend] search failed:", { url, err });
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        clearTimeout(safetyTimer);
      });

    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFrom, queryTo, queryDate]);

  // Submit search bar → at LEAST one filter (From or To or Date) is
  // enough. Date-only, From+Date, To+Date, full trio, etc. all work.
  // Whatever the user filled gets written to the URL which kicks off
  // the fetch above.
  const handleSearch = (e) => {
    e?.preventDefault?.();
    const f = from.trim(), t = to.trim(), d = (date || "").trim();

    if (!f && !t && !d) {
      setError("Please fill at least one of From, To or Date before searching.");
      return;
    }
    if (f && t && f.toLowerCase() === t.toLowerCase()) {
      setError("'From' and 'To' cannot be the same.");
      return;
    }

    setError("");
    const params = {};
    if (f) params.from = f;
    if (t) params.to   = t;
    if (d) params.date = d;
    setSearchParams(params);
  };

  const clearFilter = () => {
    setFrom(""); setTo(""); setDate("");
    setSearchParams({});
  };

  return (
    <div className="ff-page" style={{ minHeight: "100vh", background: "#dde1e9", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>

      {/* Shared Header — same navbar across the whole app */}
      <Header />

      {/* ── Search Bar ── */}
      {/* Override LocationSearch's chunky default styling so From/To match Date + Find Ride */}
      <style>{`
        .ff-search-bar .locsearch__input {
          border: none !important;
          padding: 0 !important;
          background: transparent !important;
          font-size: 14px !important;
          color: #333 !important;
          height: auto !important;
        }
        .ff-search-bar .locsearch__input:focus {
          box-shadow: none !important;
        }
      `}</style>
      <form className="ff-search-bar" onSubmit={handleSearch} style={{ padding: "28px 48px 0", display: "flex", justifyContent: "center" }}>
        <div style={{
          background: "#dde1e9",
          borderRadius: "22px",
          padding: "18px 18px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          width: "100%",
          maxWidth: "1180px",
          boxShadow: "0 6px 22px rgba(15, 15, 46, 0.06)",
        }}>
          {/* From — Tamil Nadu district autocomplete */}
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: "1 1 0",
            minWidth: 0,
            position: "relative",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(15, 15, 46, 0.04)",
          }}>
            {/* Open-circle pin icon — matches Figma "From" glyph */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a8294" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <LocationSearch
                placeholder="From"
                value={from}
                onChange={(v) => setFrom(v)}
                onSelect={(item) => setFrom(item.display_name)}
              />
            </div>
          </div>

          {/* To — Tamil Nadu district autocomplete */}
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: "1 1 0",
            minWidth: 0,
            position: "relative",
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(15, 15, 46, 0.04)",
          }}>
            {/* Map-pin glyph for "To" */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a8294" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <LocationSearch
                placeholder="To"
                value={to}
                onChange={(v) => setTo(v)}
                onSelect={(item) => setTo(item.display_name)}
              />
            </div>
          </div>

          {/* Date */}
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: "1 1 0",
            minWidth: 0,
            boxSizing: "border-box",
            boxShadow: "0 2px 8px rgba(15, 15, 46, 0.04)",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7a8294" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8"  y1="2" x2="8"  y2="6" />
              <line x1="3"  y1="10" x2="21" y2="10" />
            </svg>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                const v = e.target.value;
                setDate(v);
                const next = new URLSearchParams(searchParams);
                if (v) next.set("date", v); else next.delete("date");
                setSearchParams(next, { replace: true });
              }}
              data-has-value={date ? "true" : "false"}
              style={{ border: "none", outline: "none", fontSize: "15px", color: "#1a1a2e", width: "100%", background: "transparent", fontFamily: "inherit" }} />
          </div>

          {/* Find Ride — yellow rounded CTA, matches Figma */}
          <button type="submit" style={{
            background: "#f5c518",
            color: "#111",
            border: "none",
            borderRadius: "16px",
            padding: "0 32px",
            height: 64,
            fontWeight: 700,
            fontSize: "16px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flex: "0 0 auto",
            minWidth: 160,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: "inherit",
            boxShadow: "0 4px 14px rgba(245, 197, 24, 0.35)",
          }}>
            Find Ride
          </button>
        </div>
      </form>

      {/* Active filter chip — shows whatever combination is active
          (From-only, To-only, Date-only, or any mix) */}
      {(queryFrom || queryTo || queryDate) && (
        <div style={{ padding: "12px 48px 0", display: "flex", justifyContent: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#fff", borderRadius: 14, padding: "10px 16px",
            border: "1px solid #e5e7eb",
            fontSize: 13, color: "#1a1a2e", fontWeight: 500,
            maxWidth: 875, width: "100%",
          }}>
            <div>
              Showing rides
              {queryFrom && <> from <b>{queryFrom}</b></>}
              {queryTo   && <> to <b>{queryTo}</b></>}
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
      <div className="ff-body-flex" style={{
        padding: "20px 48px 60px",
        display: "flex", gap: "20px",
        justifyContent: "center",
        alignItems: "flex-start"
      }}>
        <FilterPanel filters={filters} setFilters={setFilters} onApply={applyFilters} onReset={resetFilters} />
        <div id="ff-cards" className="ff-cards-col" style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, maxWidth: "640px" }}>
          {loading && <LoadingRides />}

          {!loading && error && (
            <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 12, padding: 16, textAlign: "center" }}>
              {error}
            </div>
          )}

          {!loading && !error && notFound && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 12, padding: 24, textAlign: "center", lineHeight: 1.7 }}>
              No rides found{queryFrom && <> from <b>{queryFrom}</b></>}{queryTo && <> to <b>{queryTo}</b></>}{queryDate && <> on <b>{queryDate}</b></>}.
            </div>
          )}

          {/* No search yet → prompt the user to fill the form.
              "No search" = none of the URL filters are set yet. */}
          {!loading && !error && !notFound && rides.length === 0 && !queryFrom && !queryTo && !queryDate && (
            <div style={{
              background: "#fff", border: "1px dashed #cbd5e1",
              borderRadius: 14, padding: "44px 24px", textAlign: "center",
              color: "#475569",
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🚗</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>
                Find your next ride
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Enter <b>From</b>, <b>To</b> or just a <b>Date</b> in the search bar above,
                then tap <b>Find Ride</b> to see matching rides.
              </div>
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
              onConnect={handleConnect}
            />
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
