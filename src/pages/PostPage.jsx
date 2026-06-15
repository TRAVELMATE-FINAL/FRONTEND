import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps, useMapsAuthFailed } from "../utils/googleMapsLoader";
import { formatTime12h } from "../utils/time.js";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import LocationSearch from "../components/LocationSearch/LocationSearch";

const API = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

/* ─────────────────────────────────────────
   Date / time helpers — local time, no UTC
───────────────────────────────────────── */
const pad2 = (n) => String(n).padStart(2, "0");
const toISODate = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const todayISO = () => toISODate(new Date());
const nowHHMM = () => toHHMM(new Date());

const formatPretty = (d) => {
  const day = pad2(d.getDate());
  const mon = pad2(d.getMonth() + 1);
  const yr = d.getFullYear();
  let h = d.getHours();
  const m = pad2(d.getMinutes());
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `Now: ${pad2(h)}:${m} ${ap} • ${day}/${mon}/${yr}`;
};

/* ─────────────────────────────────────────
   Shared style bits
───────────────────────────────────────── */
const dot = (color) => ({
  width: 10, height: 10, borderRadius: "50%",
  background: color, marginRight: 10, flexShrink: 0,
});

const inputBase = {
  border: "none", outline: "none",
  fontFamily: "'Poppins', sans-serif",
  fontSize: 13, color: "#333", width: "100%", background: "transparent",
};

/* ─────────────────────────────────────────
   Custom 12-hour time picker (Hour / Min / AM-PM)

   Native <input type="time"> shows 12h or 24h depending on the user's
   OS locale — there's no HTML attribute to force AM/PM. To guarantee
   AM/PM rendering everywhere, we use 3 dropdowns and serialize back to
   the canonical "HH:MM" 24-hour string the rest of the app expects.
───────────────────────────────────────── */
function Time12Picker({ value, onChange, min }) {
  // Parse the incoming "HH:MM" 24h value into 12h pieces
  const parsed = (() => {
    const [hStr = "", mStr = "00"] = String(value || "").split(":");
    const h24 = parseInt(hStr, 10);
    const m   = parseInt(mStr, 10);
    if (Number.isNaN(h24)) return { h12: "", min: "", ap: "AM" };
    const ap  = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return { h12: String(h12), min: String(Number.isNaN(m) ? 0 : m).padStart(2, "0"), ap };
  })();

  const minH24 = (() => {
    if (!min) return -1;
    const [h = "", m = ""] = String(min).split(":");
    return parseInt(h, 10) * 60 + parseInt(m, 10);
  })();

  const emit = (h12, mm, ap) => {
    if (!h12 || mm === "") {
      onChange("");
      return;
    }
    let h = parseInt(h12, 10);
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const out = `${pad2(h)}:${pad2(parseInt(mm, 10))}`;
    onChange(out);
  };

  const setH  = (e) => emit(e.target.value, parsed.min || "00", parsed.ap);
  const setM  = (e) => emit(parsed.h12 || "12", e.target.value, parsed.ap);
  const setAP = (e) => emit(parsed.h12 || "12", parsed.min || "00", e.target.value);

  // Disable hour options that would always be in the past for "today"
  const hourDisabled = (h12) => {
    if (minH24 < 0) return false;
    let h24am = h12 % 12;            // hour for AM
    let h24pm = (h12 % 12) + 12;     // hour for PM
    // if BOTH AM and PM versions of this hour are < min then hide it
    return (h24am * 60) < minH24 - 59 && (h24pm * 60) < minH24 - 59;
  };

  const selectStyle = {
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "'Poppins', sans-serif",
    fontSize: 13,
    color: "#333",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    paddingRight: 4,
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#333" }}>
      <select aria-label="Hour" value={parsed.h12} onChange={setH} style={selectStyle}>
        <option value="" disabled>HH</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h} disabled={hourDisabled(h)}>{pad2(h)}</option>
        ))}
      </select>
      <span style={{ fontWeight: 600 }}>:</span>
      <select aria-label="Minutes" value={parsed.min} onChange={setM} style={selectStyle}>
        <option value="" disabled>MM</option>
        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
          <option key={m} value={pad2(m)}>{pad2(m)}</option>
        ))}
      </select>
      <select aria-label="AM or PM" value={parsed.ap} onChange={setAP} style={{ ...selectStyle, fontWeight: 600 }}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE 1 — Post (Figma redesign — vertical stack)
───────────────────────────────────────── */
function PostPage({ form, setForm, route, distance, duration, routeLoading, error, onNext, onRouteCalculated, onRouteStopsCalculated, routeSuggestedStops }) {
  const [stopInput, setStopInput] = useState("");

  const addStop = (val) => {
    const v = (val ?? stopInput).trim();
    if (!v) return;
    setForm((f) => ({ ...f, stops: [...f.stops, v] }));
    setStopInput("");
  };
  const removeStop = (i) =>
    setForm((f) => ({ ...f, stops: f.stops.filter((_, idx) => idx !== i) }));

  const minTimeAttr = form.date === todayISO() ? nowHHMM() : "00:00";

  // ── Suggested stops for the CURRENTLY SELECTED route ─────────
  //
  // RouteMap reverse-geocodes 3 points along the active route's polyline
  // and pushes the resulting town names up via `onRouteStopsCalculated`
  // (stored in the parent as `routeSuggestedStops`). That means switching
  // between alternate routes on the map gives you a different set of
  // suggested stops — the towns the user would actually pass through on
  // THAT route, not a fixed table.
  //
  // We fall back to a small hardcoded table for the most popular TN
  // corridors when the geocoder hasn't returned yet (or returned nothing).
  const suggestedStops = (() => {
    if (Array.isArray(routeSuggestedStops) && routeSuggestedStops.length > 0) {
      return routeSuggestedStops;
    }

    const f = (form.from || "").toLowerCase();
    const t = (form.to   || "").toLowerCase();
    if (!f || !t) return [];

    const ROUTES = [
      { from: "chennai",    to: "bangalore",   stops: ["Vellore", "Krishnagiri"] },
      { from: "chennai",    to: "madurai",     stops: ["Trichy", "Dindigul"] },
      { from: "chennai",    to: "coimbatore",  stops: ["Salem", "Erode"] },
      { from: "coimbatore", to: "madurai",     stops: ["Dindigul", "Pollachi"] },
      { from: "madurai",    to: "trichy",      stops: ["Dindigul", "Manapparai"] },
      { from: "madurai",    to: "kanyakumari", stops: ["Tirunelveli", "Nagercoil"] },
      { from: "salem",      to: "bangalore",   stops: ["Krishnagiri", "Hosur"] },
      { from: "trichy",     to: "chennai",     stops: ["Villupuram", "Tindivanam"] },
    ];

    const match = ROUTES.find(
      (r) =>
        (f.includes(r.from) && t.includes(r.to)) ||
        (f.includes(r.to)   && t.includes(r.from))   // reverse direction works too
    );
    if (match) return match.stops;

    // Generic fallback: middle-of-state cities that show up on most
    // long-haul TN journeys.
    return ["Salem", "Trichy"];
  })();

  const isStopAlready = (name) =>
    form.stops.some((s) => s.toLowerCase() === name.toLowerCase());

  // ── Reusable single-line field block (label on top, input below) ──
  // Uses the Figma label font: Plus Jakarta Sans, 13/600, dark slate.
  const fieldBlock = (label, body) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 13,
        color: "#1a1a2e",
        fontWeight: 600,
        marginBottom: 6,
        letterSpacing: "-0.1px",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>{label}</div>
      {body}
    </div>
  );

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', 'Inter', 'DM Sans', system-ui, sans-serif",
      background: "#f5f5f7", minHeight: "100vh", padding: "28px 16px 40px",
    }}>
      {/* Strip LocationSearch's default chrome so From/To render as a
          single clean input field rather than a "box inside a box". */}
      <style>{`
        .post-page-card .locsearch__input {
          border: none !important;
          padding: 0 !important;
          background: transparent !important;
          height: auto !important;
          font-size: 14px !important;
          color: #1a1a2e !important;
          font-family: inherit !important;
          width: 100%;
        }
        .post-page-card .locsearch__input:focus { box-shadow: none !important; }
        .post-page-card .locsearch__input::placeholder { color: #9ca3af !important; }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        {/* Heading OUTSIDE the card — matches Figma */}
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e", margin: 0, letterSpacing: "-0.4px" }}>Post</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>Share your journey with others</p>
        </div>

        {/* Main white card */}
        <div className="post-page-card" style={{
          background:"#fff", borderRadius:16, overflow:"visible",
          boxShadow:"0 4px 18px rgba(0,0,0,0.06)",
          padding: "22px 22px 6px",
        }}>

          {/* From — same map-pin glyph as Hero, violet for the starting point */}
          {fieldBlock(
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              From
            </>,
            <div style={{
              border: "1.5px solid #e5e7eb", borderRadius: 10,
              padding: "12px 14px", background: "#fff",
            }}>
              <LocationSearch
                placeholder="Starting location"
                value={form.from}
                onChange={(v) => setForm((f) => ({ ...f, from: v, fromCoords: null }))}
                onSelect={(item) => setForm((f) => ({ ...f, from: item.display_name, fromCoords: { lat: item.lat, lon: item.lon } }))}
              />
            </div>
          )}

          {/* To — same map-pin glyph as Hero */}
          {fieldBlock(
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              To
            </>,
            <div style={{
              border: "1.5px solid #e5e7eb", borderRadius: 10,
              padding: "12px 14px", background: "#fff",
            }}>
              <LocationSearch
                placeholder="Destination"
                value={form.to}
                onChange={(v) => setForm((f) => ({ ...f, to: v, toCoords: null }))}
                onSelect={(item) => setForm((f) => ({ ...f, to: item.display_name, toCoords: { lat: item.lat, lon: item.lon } }))}
              />
            </div>
          )}

          {/* Date + Time — side by side on the same row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            {/* Date */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, color: "#1a1a2e", fontWeight: 600,
                marginBottom: 6, letterSpacing: "-0.1px",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Date
              </div>
              <input
                type="date"
                value={form.date}
                min={todayISO()}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                style={{
                  width: "100%",
                  border: "1.5px solid #e5e7eb", borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 14, fontFamily: "inherit", color: "#1a1a2e",
                  outline: "none", background: "#fff",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Time */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, color: "#1a1a2e", fontWeight: 600,
                marginBottom: 6, letterSpacing: "-0.1px",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 14" />
                </svg>
                Time
              </div>
              <div style={{
                border: "1.5px solid #e5e7eb", borderRadius: 10,
                padding: "10px 14px", background: "#fff",
              }}>
                <Time12Picker
                  value={form.time}
                  min={minTimeAttr}
                  onChange={(v) => setForm((f) => ({ ...f, time: v }))}
                />
              </div>
            </div>
          </div>

          {/* Gender — small pill row */}
          <div style={{ display:"flex", gap:10, marginBottom:18 }}>
            {["Male","Female"].map((g) => {
              const active = form.gender === g;
              return (
                <button key={g} type="button"
                  onClick={() => setForm((f) => ({ ...f, gender: g }))}
                  style={{
                    display:"flex", alignItems:"center", gap:6,
                    border:`1.5px solid ${active?"#4f6ef7":"#e5e7eb"}`,
                    borderRadius:24, padding:"8px 20px",
                    fontSize:13, fontFamily:"inherit", cursor:"pointer",
                    background:active?"#eef2ff":"#fff",
                    color:active?"#4f6ef7":"#444", fontWeight:600
                  }}>
                  👤 {g}
                </button>
              );
            })}
          </div>

          {/* ── Confirm your route ────────────────────────────────
              Two separate stacked cards, exactly like the Figma:
                1) Details card — from → to row + hours / km row
                2) Map card     — just the map preview          */}
          <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e", marginBottom:8, letterSpacing:"-0.1px" }}>
            Confirm your route
          </div>

          {/* Card 1 — details only */}
          <div style={{
            background:"#fff",
            border:"1px solid #e5e7eb",
            borderRadius:12,
            padding:"14px 16px",
            marginBottom:10,
          }}>
            {/* From → To row */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              gap:8,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:"1 1 0" }}>
                <div style={{
                  width:22, height:22, borderRadius:"50%",
                  background:"#4f6ef7", color:"#fff",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:700, flexShrink:0,
                }}>A</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:10, color:"#9ca3af", fontWeight:500 }}>From</div>
                  <div style={{
                    fontSize:13, color:"#1a1a2e", fontWeight:600,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  }}>
                    {form.from || "—"}
                  </div>
                </div>
              </div>
              <span style={{ color:"#cbd5e1", fontSize:18, flexShrink:0 }}>→</span>
              <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:"1 1 0", justifyContent:"flex-end" }}>
                <div style={{ textAlign:"right", minWidth:0 }}>
                  <div style={{ fontSize:10, color:"#9ca3af", fontWeight:500 }}>To</div>
                  <div style={{
                    fontSize:13, color:"#1a1a2e", fontWeight:600,
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  }}>
                    {form.to || "—"}
                  </div>
                </div>
                <div style={{
                  width:22, height:22, borderRadius:"50%",
                  background:"#ef4444", color:"#fff",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:10, fontWeight:700, flexShrink:0,
                }}>B</div>
              </div>
            </div>

            {/* hours / km row — divider on top */}
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:32,
              marginTop:12, paddingTop:12,
              borderTop:"1px solid #f3f4f6",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#4b5563", fontWeight:600 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 14" />
                </svg>
                {routeLoading ? "calculating…" : (duration || "—")}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#4b5563", fontWeight:600 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                {routeLoading ? "calculating…" : (distance || "—")}
              </div>
            </div>
          </div>

          {/* Card 2 — map only (taller so the route reads clearly) */}
          <div style={{
            border:"1px solid #e5e7eb",
            borderRadius:12,
            overflow:"hidden",
            marginBottom:14,
            height: 260,
          }}>
            <RouteMap
              coords={route}
              fromCoords={form.fromCoords}
              toCoords={form.toCoords}
              fromName={form.from}
              toName={form.to}
              onRouteCalculated={onRouteCalculated}
              onRouteStopsCalculated={onRouteStopsCalculated}
            />
          </div>

          {/* Add stopovers — Figma label with "(optional)" on next line */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>Add stopovers</div>
            <div style={{ fontSize:11, color:"#9ca3af", marginTop: 2 }}>(optional)</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{
              flex:1, border:"1.5px solid #e5e7eb", borderRadius:20,
              padding:"9px 14px", display:"flex", alignItems:"center", gap:8, background:"#fff",
            }}>
              {/* Grey map-pin glyph — same shape as From/To, neutral colour */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <input
                style={{ ...inputBase, fontSize: 13 }}
                placeholder="Add a stop along the way"
                value={stopInput}
                onChange={(e) => setStopInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStop())}
              />
            </div>
            <button type="button" onClick={() => addStop()}
              style={{
                width:32, height:32, background:"#4f6ef7",
                borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                border:"none", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0,
                fontFamily: "inherit",
              }}>+</button>
          </div>

          {/* Suggested stop chips — only shown when from + to are picked */}
          {suggestedStops.length > 0 && (
            <>
              <div style={{ fontSize:11, color:"#6b7280", marginBottom:6 }}>Suggested stops</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14 }}>
                {suggestedStops.map((s) => {
                  const taken = isStopAlready(s);
                  return (
                    <button key={s} type="button"
                      disabled={taken}
                      onClick={() => addStop(s)}
                      style={{
                        border:"1.5px solid " + (taken ? "#e5e7eb" : "#cbd5e1"),
                        background: taken ? "#f3f4f6" : "#fff",
                        color: taken ? "#9ca3af" : "#1a1a2e",
                        borderRadius:18, padding:"6px 14px",
                        fontSize:12, fontWeight:600,
                        cursor: taken ? "not-allowed" : "pointer",
                        fontFamily:"inherit",
                      }}>
                      {taken ? "✓ " : "+ "}{s}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* User-added stops list */}
          {form.stops.length > 0 && (
            <>
              <div style={{ fontSize:11, color:"#6b7280", marginBottom:6 }}>Stops</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
                {form.stops.map((s, i) => (
                  <button key={i} type="button"
                    onClick={() => removeStop(i)}
                    title="Click to remove"
                    style={{
                      border:"1.5px solid #4f6ef7",
                      borderRadius:18, padding:"5px 13px",
                      fontSize:12, color:"#4f6ef7", background:"#eef2ff",
                      cursor:"pointer", fontFamily:"inherit", fontWeight:600,
                    }}>
                    {s} ×
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <div style={{
              background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626",
              borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom: 12,
            }}>
              {error}
            </div>
          )}

          <button onClick={onNext} type="button"
            style={{
              width:"100%", display:"block",
              background:"#f5c518", border:"none", borderRadius:10,
              padding:"14px 18px", fontSize:16, fontWeight:700,
              fontFamily:"inherit", color:"#1a1a2e", cursor:"pointer",
              marginBottom: 18,
              boxShadow: "0 4px 14px rgba(245, 197, 24, 0.30)",
            }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

/* Real Google Map with actual driving route from Google Directions API.
   Accepts the same props as the old Leaflet version — `coords` is now ignored
   (Google computes the route from fromCoords/toCoords directly).

   Shows ALL alternate routes returned by Google Directions. The currently
   selected route is rendered in vivid blue, alternates are rendered in
   faded grey and become click-targets so the user can swap to them. */
function RouteMap({ fromCoords, toCoords, fromName, toName, compact = false, onRouteCalculated, onRouteStopsCalculated }) {
  // Compact = small inline preview (used in step 1); default = large map card.
  const mapHeight = compact ? 140 : 260;

  const { isLoaded, loadError } = useGoogleMaps();
  const authFailed = useMapsAuthFailed();

  const mapRef = useRef(null);
  // We render alternate routes ourselves as a set of Polylines so that we
  // can style each one individually and let the user click to pick one.
  const routePolylinesRef = useRef([]); // [{ line, routeIndex }]
  const fallbackPolylineRef = useRef(null);
  const markersRef = useRef([]);
  const directionsResultRef = useRef(null);
  // Reverse-geocoded town names along each route, keyed by route index.
  // We compute on demand for whichever route the user picks (so each
  // alternate has its own suggested stops) and cache the result so
  // toggling back is instant.
  const routeStopsCacheRef = useRef({}); // { 0: ["Vellore","Krishnagiri"], 1: [...] }
  const [routeError, setRouteError] = useState("");
  const [routeInfo, setRouteInfo] = useState({ distance: "", duration: "" });
  const [routes, setRoutes] = useState([]); // [{ distance, duration, summary }]
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  // mapReady is a STATE (not just ref) so the route-drawing useEffect re-runs
  // once Google has actually mounted the <GoogleMap>. Otherwise the effect
  // can fire while mapRef.current is still null, bail out, and never retry.
  const [mapReady, setMapReady] = useState(false);

  const haveCoords = !!(fromCoords && toCoords);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);
  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
    setMapReady(false);
  }, []);

  const clearMapLayers = useCallback(() => {
    routePolylinesRef.current.forEach((entry) => {
      if (entry?.line) entry.line.setMap(null);
    });
    routePolylinesRef.current = [];
    if (fallbackPolylineRef.current) {
      fallbackPolylineRef.current.setMap(null);
      fallbackPolylineRef.current = null;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }, []);

  // Re-style the polylines so the selected one pops and the alternates are dim.
  const restyleRoutes = useCallback((selectedIdx) => {
    routePolylinesRef.current.forEach((entry) => {
      if (!entry?.line) return;
      const isActive = entry.routeIndex === selectedIdx;
      entry.line.setOptions({
        strokeColor: isActive ? "#4f6ef7" : "#9ca3af",
        strokeOpacity: isActive ? 0.95 : 0.55,
        strokeWeight: isActive ? 5 : 4,
        zIndex: isActive ? 10 : 1,
      });
    });
  }, []);

  // Render the route whenever from/to changes (or once the map is ready).
  // `mapReady` is included in the deps so the effect re-fires after the
  // <GoogleMap> mounts on first paint.
  useEffect(() => {
    if (!isLoaded || !mapReady || !haveCoords || !mapRef.current) return;
    const g = window.google;
    const map = mapRef.current;
    clearMapLayers();
    // Reset selection whenever the from/to changes so the new primary is shown.
    setSelectedRouteIdx(0);
    // Invalidate the per-route stop cache — these are tied to the previous
    // origin/destination and no longer make sense for the new search.
    routeStopsCacheRef.current = {};

    const directionsService = new g.maps.DirectionsService();

    const origin = { lat: Number(fromCoords.lat), lng: Number(fromCoords.lon) };
    const destination = { lat: Number(toCoords.lat), lng: Number(toCoords.lon) };

    const drawAB = () => {
      const from = new g.maps.Marker({
        position: origin,
        map,
        label: { text: "A", color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4f6ef7",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: fromName || "From",
        zIndex: 50,
      });
      const to = new g.maps.Marker({
        position: destination,
        map,
        label: { text: "B", color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
        title: toName || "To",
        zIndex: 50,
      });
      markersRef.current = [from, to];
    };

    directionsService.route(
      {
        origin,
        destination,
        travelMode: g.maps.TravelMode.DRIVING,
        // 🔑 Ask Google for alternate routes whenever they exist.
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status === "OK") {
          directionsResultRef.current = result;
          const allRoutes = result.routes || [];

          // Draw each route as its own Polyline so we can style + click them
          allRoutes.forEach((route, idx) => {
            const path = route.overview_path || [];
            const line = new g.maps.Polyline({
              path,
              map,
              strokeColor: idx === 0 ? "#4f6ef7" : "#9ca3af",
              strokeOpacity: idx === 0 ? 0.95 : 0.55,
              strokeWeight: idx === 0 ? 5 : 4,
              zIndex: idx === 0 ? 10 : 1,
              clickable: true,
            });
            // Clicking a faded route promotes it to the "selected" route.
            line.addListener("click", () => {
              setSelectedRouteIdx(idx);
            });
            routePolylinesRef.current.push({ line, routeIndex: idx });
          });

          // Fit the map so all routes (or at least the primary one) are visible.
          const bounds = new g.maps.LatLngBounds();
          (allRoutes[0]?.overview_path || []).forEach((p) => bounds.extend(p));
          if (!bounds.isEmpty()) map.fitBounds(bounds, 40);

          drawAB();

          // Build a small summary list to show under the map.
          const summaries = allRoutes.map((r) => {
            const leg = r.legs?.[0];
            return {
              distance: leg?.distance?.text || "",
              duration: leg?.duration?.text || "",
              summary: r.summary || "",
            };
          });
          setRoutes(summaries);

          // Primary distance / duration goes up to parent (selected = index 0)
          const next = {
            distance: summaries[0]?.distance || "",
            duration: summaries[0]?.duration || "",
          };
          setRouteInfo(next);
          if (typeof onRouteCalculated === "function") onRouteCalculated(next);
          setRouteError("");
        } else {
          // Fallback: straight line between A and B
          const path = [origin, destination];
          const line = new g.maps.Polyline({
            path,
            map,
            strokeColor: "#4f6ef7",
            strokeOpacity: 0.9,
            strokeWeight: 4,
          });
          fallbackPolylineRef.current = line;
          const bounds = new g.maps.LatLngBounds();
          path.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, 40);
          drawAB();
          setRoutes([]);
          // Fallback: use Distance Matrix to still surface km/min when Directions fails
          if (g.maps.DistanceMatrixService) {
            const dm = new g.maps.DistanceMatrixService();
            dm.getDistanceMatrix(
              {
                origins: [origin],
                destinations: [destination],
                travelMode: g.maps.TravelMode.DRIVING,
                unitSystem: g.maps.UnitSystem.METRIC,
              },
              (resp, st) => {
                const el = resp?.rows?.[0]?.elements?.[0];
                if (st === "OK" && el?.status === "OK") {
                  const next = {
                    distance: el.distance?.text || "",
                    duration: el.duration?.text || "",
                  };
                  setRouteInfo(next);
                  if (typeof onRouteCalculated === "function") onRouteCalculated(next);
                } else {
                  setRouteInfo({ distance: "", duration: "" });
                }
              }
            );
          }
          setRouteError("Direct line shown");
        }
      }
    );

    return () => {
      clearMapLayers();
    };
  }, [
    isLoaded,
    mapReady,
    haveCoords,
    fromCoords?.lat,
    fromCoords?.lon,
    toCoords?.lat,
    toCoords?.lon,
    fromName,
    toName,
    clearMapLayers,
  ]);

  // Compute suggested stops for a given route by sampling 3 points along
  // its polyline and asking the Google Geocoder for the locality at each
  // point. Returns a Promise<string[]> of distinct town/city names
  // (excluding origin + destination).
  const computeStopsForRoute = useCallback((routeIdx) => {
    const g = window.google;
    if (!g || !directionsResultRef.current) return Promise.resolve([]);
    const route = directionsResultRef.current.routes &&
                  directionsResultRef.current.routes[routeIdx];
    const path = (route && route.overview_path) || [];
    if (path.length < 4) return Promise.resolve([]);

    // Sample at 25%, 50%, 75% of the polyline — covers the route nicely
    // without burning a geocode call on every coordinate.
    const sampleIdxs = [
      Math.floor(path.length / 4),
      Math.floor(path.length / 2),
      Math.floor((path.length * 3) / 4),
    ];
    const sampleLocs = sampleIdxs.map((i) => path[i]);
    const geocoder = new g.maps.Geocoder();

    // Names we want to exclude (origin + destination) so we don't suggest
    // the user's own from/to as a "stop".
    const exclude = new Set(
      [fromName, toName]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase())
    );

    const reverse = (loc) =>
      new Promise((resolve) => {
        geocoder.geocode({ location: loc }, (results, status) => {
          if (status !== "OK" || !results || !results.length) {
            resolve(null);
            return;
          }
          // Walk results from most-specific to least-specific and grab
          // the first locality / town / district name we find.
          for (const r of results) {
            const comps = r.address_components || [];
            const wanted = ["locality", "postal_town",
                            "administrative_area_level_3",
                            "administrative_area_level_2"];
            for (const type of wanted) {
              const c = comps.find((cc) => (cc.types || []).indexOf(type) !== -1);
              if (c && c.long_name) {
                resolve(c.long_name);
                return;
              }
            }
          }
          resolve(null);
        });
      });

    return Promise.all(sampleLocs.map(reverse)).then((names) => {
      const seen = new Set();
      const out = [];
      names.forEach((n) => {
        if (!n) return;
        const key = n.toLowerCase();
        if (exclude.has(key)) return;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(n);
      });
      return out;
    });
  }, [fromName, toName]);

  // Whenever the user picks a different alternate, re-style the polylines,
  // push new distance/duration to the parent, refit bounds, AND compute
  // per-route suggested stops (cached so repeat toggles are instant).
  useEffect(() => {
    restyleRoutes(selectedRouteIdx);
    const r = routes[selectedRouteIdx];
    if (r && (r.distance || r.duration)) {
      const next = { distance: r.distance, duration: r.duration };
      setRouteInfo(next);
      if (typeof onRouteCalculated === "function") onRouteCalculated(next);
    }
    // Refit map bounds to the currently selected route
    const g = window.google;
    if (g && mapRef.current && directionsResultRef.current) {
      const route = directionsResultRef.current.routes?.[selectedRouteIdx];
      const path = route?.overview_path || [];
      if (path.length) {
        const bounds = new g.maps.LatLngBounds();
        path.forEach((p) => bounds.extend(p));
        mapRef.current.fitBounds(bounds, 40);
      }
    }

    // Per-route suggested stops — use cache if we already computed this
    // route's stops, otherwise reverse-geocode and cache the result.
    if (typeof onRouteStopsCalculated !== "function") return;
    if (!directionsResultRef.current) return;
    const cached = routeStopsCacheRef.current[selectedRouteIdx];
    if (cached) {
      onRouteStopsCalculated(cached);
      return;
    }
    let cancelled = false;
    computeStopsForRoute(selectedRouteIdx).then((stops) => {
      if (cancelled) return;
      routeStopsCacheRef.current[selectedRouteIdx] = stops;
      onRouteStopsCalculated(stops);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteIdx, routes]);

  // Empty placeholder while user is picking locations
  if (!haveCoords) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: mapHeight,
          background: "linear-gradient(135deg,#dbeafe 0%,#dcfce7 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Pick From and To to see the route
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          width: "100%",
          height: mapHeight,
          background: "#fee2e2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "#b91c1c",
        }}
      >
        Google Maps failed to load — check VITE_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  // Script loaded but Google rejected the key at runtime — the usual cause of
  // a blank/white map. Tell the user the real reason instead of showing nothing.
  if (authFailed) {
    return (
      <div
        style={{
          width: "100%",
          height: mapHeight,
          background: "#fef3c7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 12,
          fontSize: 12,
          color: "#92400e",
        }}
      >
        Map blocked by Google — add this site's domain to the API key's allowed
        referrers and enable billing + the Maps JavaScript / Directions / Places APIs.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          width: "100%",
          height: mapHeight,
          background: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: "#64748b",
        }}
      >
        Loading map…
      </div>
    );
  }

  // Initial center — midpoint between A and B
  const center = {
    lat: (Number(fromCoords.lat) + Number(toCoords.lat)) / 2,
    lng: (Number(fromCoords.lon) + Number(toCoords.lon)) / 2,
  };

  return (
    <div style={{ width: "100%", height: mapHeight, position: "relative" }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={7}
        options={{
          disableDefaultUI: true,
          zoomControl: !compact,
          gestureHandling: compact ? "none" : "cooperative",
          clickableIcons: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        }}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      />
      {routeError && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            background: "rgba(220, 38, 38, 0.85)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: 6,
            pointerEvents: "none",
          }}
        >
          {routeError}
        </div>
      )}
      {(routeInfo.distance || routeInfo.duration) && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            display: "flex",
            gap: 6,
            pointerEvents: "none",
          }}
        >
          {routeInfo.distance && (
            <span
              style={{
                background: "rgba(15, 23, 42, 0.9)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: 999,
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                lineHeight: 1,
              }}
            >
              <span aria-hidden>📍</span>
              {routeInfo.distance}
            </span>
          )}
          {routeInfo.duration && (
            <span
              style={{
                background: "rgba(79, 110, 247, 0.95)",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 10px",
                borderRadius: 999,
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                lineHeight: 1,
              }}
            >
              <span aria-hidden>⏱</span>
              {routeInfo.duration}
            </span>
          )}
        </div>
      )}

      {/* ── Alternate routes picker ─────────────────────────────────
          When Google returns more than one option we surface them as
          chips below the map so the poster can pick the route they
          actually plan to take. Clicking a chip (or clicking the
          faded grey line on the map itself) makes that route active. */}
      {routes.length > 1 && !compact && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            pointerEvents: "auto",
          }}
        >
          {routes.map((r, idx) => {
            const active = idx === selectedRouteIdx;
            const label = r.summary
              ? `via ${r.summary}`
              : idx === 0
              ? "Fastest route"
              : `Alternate ${idx}`;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedRouteIdx(idx)}
                style={{
                  background: active ? "#4f6ef7" : "rgba(255,255,255,0.95)",
                  color: active ? "#fff" : "#1a1a2e",
                  border: active ? "1px solid #4f6ef7" : "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  lineHeight: 1.1,
                  maxWidth: "100%",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={`${label} • ${r.distance || ""} • ${r.duration || ""}`}
              >
                <span>{label}</span>
                {(r.distance || r.duration) && (
                  <span style={{ opacity: 0.85, fontWeight: 600 }}>
                    · {r.duration || r.distance}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE 2 — Vehicle details (Figma redesign)
───────────────────────────────────────── */
function PostRidePage({ form, setForm, onPublish, publishing, error, onBack }) {
  /* Shared bordered-box input style matching Figma */
  const boxedInput = {
    width: "100%",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    outline: "none",
    padding: "13px 16px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#1a1a2e",
    background: "#fff",
    boxSizing: "border-box",
  };

  /* SVG icons — match Figma exactly (purple accent for active) */
  const VehicleIcon = ({ color = "#7c3aed" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
      <circle cx="6.5" cy="16.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
  const PeopleIcon = ({ color = "#7c3aed" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
  const NotesIcon = ({ color = "#7c3aed" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );

  /* Large vehicle silhouettes shown inside the Car / Bike selector cards */
  const CarSilhouette = ({ color }) => (
    <svg viewBox="0 0 80 48" width="80" height="48" fill="none" aria-hidden="true">
      <path d="M10 32h60v-7a3 3 0 0 0-2.5-2.95L60 20l-6-9a3 3 0 0 0-2.5-1.3H29.5A3 3 0 0 0 27 11l-6 9-7.5 2.05A3 3 0 0 0 11 25v7h-1z"
        fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M27 11l-4 9h34l-4-9" fill="#fff" opacity="0.18"/>
      <circle cx="22" cy="34" r="6" fill="#1a1a2e"/>
      <circle cx="22" cy="34" r="2.5" fill="#fff"/>
      <circle cx="58" cy="34" r="6" fill="#1a1a2e"/>
      <circle cx="58" cy="34" r="2.5" fill="#fff"/>
    </svg>
  );
  const BikeSilhouette = ({ color }) => (
    <svg viewBox="0 0 80 48" width="80" height="48" fill="none" aria-hidden="true" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="34" r="9" />
      <circle cx="64" cy="34" r="9" />
      <path d="M16 34 L34 16 L52 34" />
      <path d="M30 16 L42 16" />
      <path d="M40 16 L48 8 L56 8" />
      <path d="M52 34 L46 22 L34 22" />
    </svg>
  );

  /* Reusable section label (icon + text) — matches Figma typography */
  const SectionLabel = ({ icon, children }) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
      {icon}
      <span style={{ fontSize:14, fontWeight:600, color:"#1a1a2e", letterSpacing:"-0.1px" }}>
        {children}
      </span>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', 'Inter', 'DM Sans', system-ui, sans-serif",
      background: "#f5f5f7", minHeight: "100vh", padding: "28px 16px 40px",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        {/* Heading OUTSIDE the card — clean Figma layout, no date/time chip */}
        <div style={{ marginBottom: 18, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:700, color:"#1a1a2e", margin:0, letterSpacing:"-0.4px" }}>Post</h1>
            <p style={{ fontSize:14, color:"#6b7280", margin:"4px 0 0" }}>Share your journey with others</p>
          </div>
          <button onClick={onBack} type="button"
            style={{
              background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:8,
              padding:"6px 12px", fontSize:12, color:"#4b5563", cursor:"pointer",
              fontFamily:"inherit", fontWeight:500, flexShrink:0,
            }}>
            ← Back
          </button>
        </div>

        {/* Main white card */}
        <div style={{
          background:"#fff", borderRadius:16,
          boxShadow:"0 4px 18px rgba(0,0,0,0.06)",
          padding:"22px 22px 22px",
        }}>

          {/* Vehicle Type */}
          <div style={{ marginBottom: 22 }}>
            <SectionLabel icon={<VehicleIcon />}>Vehicle Type</SectionLabel>
            <div style={{ display:"flex", gap:12 }}>
              {["Car","Bike"].map((v) => {
                const active = form.vehicleType === v;
                const Silhouette = v === "Car" ? CarSilhouette : BikeSilhouette;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, vehicleType: v }))}
                    style={{
                      flex:1,
                      border: active ? "2px solid #7c3aed" : "1.5px solid #e5e7eb",
                      borderRadius:14,
                      padding:"20px 12px 14px",
                      display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                      cursor:"pointer",
                      background: active ? "#faf5ff" : "#fff",
                      transition:"all 0.18s ease",
                      fontFamily:"inherit",
                    }}>
                    <Silhouette color={active ? "#1a1a2e" : "#cbd5e1"} />
                    <span style={{
                      fontSize:14, fontWeight:600,
                      color: active ? "#1a1a2e" : "#9ca3af",
                      letterSpacing:"-0.1px",
                    }}>{v}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display:"block", fontSize:14, fontWeight:600, color:"#1a1a2e",
              marginBottom:8, letterSpacing:"-0.1px",
            }}>Color</label>
            <input
              type="text"
              style={boxedInput}
              placeholder="Enter Colour"
              value={form.vehicleColor}
              onChange={(e) => setForm((f) => ({ ...f, vehicleColor: e.target.value }))}
            />
          </div>

          {/* Vehicle Name */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display:"block", fontSize:14, fontWeight:600, color:"#1a1a2e",
              marginBottom:8, letterSpacing:"-0.1px",
            }}>Vehicle Name</label>
            <input
              type="text"
              style={boxedInput}
              placeholder="Enter Name"
              value={form.vehicleName}
              onChange={(e) => setForm((f) => ({ ...f, vehicleName: e.target.value }))}
            />
          </div>

          {/* Number Plate */}
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display:"block", fontSize:14, fontWeight:600, color:"#1a1a2e",
              marginBottom:8, letterSpacing:"-0.1px",
            }}>Number Plate</label>
            <input
              type="text"
              style={boxedInput}
              placeholder="Enter number"
              value={form.plateNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, plateNumber: e.target.value.toUpperCase().replace(/\s+/g, "") }))
              }
              maxLength={11}
            />
          </div>

          {/* Available Seats */}
          <div style={{ marginBottom: 18 }}>
            <SectionLabel icon={<PeopleIcon />}>Available Seats</SectionLabel>
            <div style={{
              ...boxedInput,
              padding: 0,
              display:"flex", alignItems:"center", overflow:"hidden",
            }}>
              <input
                type="number"
                value={form.seats}
                min={1}
                max={8}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  seats: Math.max(1, Math.min(8, Number(e.target.value) || 1)),
                }))}
                style={{
                  flex:1, border:"none", outline:"none",
                  padding:"13px 16px",
                  fontSize:15, fontFamily:"inherit", color:"#1a1a2e",
                  background:"transparent",
                  minWidth: 0,
                }}
              />
              <div style={{ display:"flex", gap:6, padding:"0 10px 0 4px" }}>
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, seats: Math.max(1, (Number(f.seats)||1) - 1) }))}
                  style={{
                    width:30, height:30, border:"1.5px solid #e5e7eb", borderRadius:8,
                    background:"#fff", cursor:"pointer", fontSize:18, fontWeight:600,
                    color:"#4b5563", lineHeight:1,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"inherit",
                  }}>−</button>
                <button type="button"
                  onClick={() => setForm((f) => ({ ...f, seats: Math.min(8, (Number(f.seats)||1) + 1) }))}
                  style={{
                    width:30, height:30, border:"1.5px solid #e5e7eb", borderRadius:8,
                    background:"#fff", cursor:"pointer", fontSize:18, fontWeight:600,
                    color:"#4b5563", lineHeight:1,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"inherit",
                  }}>+</button>
              </div>
            </div>
          </div>

          {/* Notes & Preferences */}
          <div style={{ marginBottom: 22 }}>
            <SectionLabel icon={<NotesIcon />}>Notes & Preferences</SectionLabel>
            <textarea
              placeholder="e.g., No smoking, music lovers welcome, pet friendly..."
              value={form.notes}
              maxLength={500}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              style={{
                ...boxedInput,
                resize:"none",
                height:110,
                paddingTop:14,
              }}
            />
          </div>

          {error && (
            <div style={{
              background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626",
              borderRadius:10, padding:"11px 14px", fontSize:13, marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          {/* Publish Ride — yellow Figma button */}
          <button onClick={onPublish} type="button" disabled={publishing}
            style={{
              width:"100%", display:"block",
              background: publishing ? "#f5d56a" : "#f5c518",
              border:"none", borderRadius:12,
              padding:"15px 18px", fontSize:16, fontWeight:700,
              fontFamily:"inherit", color:"#1a1a2e",
              cursor: publishing ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(245, 197, 24, 0.30)",
              letterSpacing:"-0.1px",
            }}>
            {publishing ? "Publishing…" : "Publish Trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Root — manages state + auto-route + publish
───────────────────────────────────────── */
export default function TravelMatePost({ embedded = false } = {}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    from: "", fromCoords: null,
    to: "",   toCoords: null,
    date: "", time: "", gender: "Male",
    stops: [],
    vehicleType: "Car", vehicleColor: "", vehicleName: "", plateNumber: "",
    seats: 1, notes: "",
  });

  // Auto-fetch route when both coordinates are picked
  const [route, setRoute] = useState([]);     // [[lat,lon],...]
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  // Suggested stops for whichever alternate route is currently selected
  // on the map. RouteMap reverse-geocodes midpoints of the active route
  // and pushes the resulting town names up here.
  const [routeSuggestedStops, setRouteSuggestedStops] = useState([]);

  const lastReqRef = useRef("");

  useEffect(() => {
    const f = form.fromCoords, t = form.toCoords;
    if (!f || !t) {
      setRoute([]); setDistance(""); setDuration("");
      setRouteSuggestedStops([]);
      return;
    }
    // Different from/to → previous route's stops no longer apply.
    setRouteSuggestedStops([]);
    const reqKey = `${f.lat},${f.lon}-${t.lat},${t.lon}`;
    if (reqKey === lastReqRef.current) return;
    lastReqRef.current = reqKey;

    let cancelled = false;
    (async () => {
      try {
        setRouteLoading(true);
        const r = await axios.get(`${API}/api/route`, {
          params: { fromLat: f.lat, fromLng: f.lon, toLat: t.lat, toLng: t.lon },
        });
        if (cancelled) return;
        const flipped = (r.data?.geometry || []).map(([lon, lat]) => [lat, lon]);
        setRoute(flipped);
        setDistance(r.data?.distance || "");
        setDuration(r.data?.duration || "");
      } catch (err) {
        if (cancelled) return;
        console.warn("route fetch failed:", err?.response?.data || err.message);
        setRoute([[f.lat, f.lon], [t.lat, t.lon]]);
        const km = Math.round(haversine(f.lat, f.lon, t.lat, t.lon));
        setDistance(km > 0 ? `${km} km` : "");
        setDuration(km > 0 ? `${Math.round(km / 50)} hr ${Math.round((km / 50 * 60) % 60)} min` : "");
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [form.fromCoords, form.toCoords]);

  // Page 1 → Page 2 validation
  const goToVehicle = () => {
    setError("");
    if (!form.from.trim() || !form.to.trim()) { setError("Please enter both From and To"); return; }
    if (form.from.trim().toLowerCase() === form.to.trim().toLowerCase()) { setError("'From' and 'To' cannot be the same"); return; }
    if (!form.date) { setError("Please select a date"); return; }
    if (!form.time) { setError("Please select a time"); return; }
    if (form.date < todayISO()) { setError("Date cannot be in the past"); return; }
    if (form.date === todayISO() && form.time < nowHHMM()) { setError("Time has already passed — pick a future time"); return; }
    if (!form.gender) { setError("Please choose a gender preference"); return; }
    if (!distance || !duration) { setError("Route is still calculating — please wait a moment"); return; }
    setStep(2);
  };

  // Indian number-plate validators (works on the form's plateNumber field).
  // Standard: TN09AB1234 (state 2 letters + RTO 2 digits + series 1-3 letters + 1-4 digits)
  // BH (Bharat) series: 22BH1234AB
  const PLATE_RX_STANDARD = /^[A-Z]{2}\d{2}[A-Z]{1,3}\d{1,4}$/;
  const PLATE_RX_BH       = /^\d{2}BH\d{4}[A-Z]{1,2}$/;
  const validatePlate = (raw) => {
    const v = String(raw || "").replace(/\s+/g, "").toUpperCase();
    if (!v) return { ok: false, msg: "Number plate is required" };
    if (PLATE_RX_STANDARD.test(v)) return { ok: true };
    if (PLATE_RX_BH.test(v))       return { ok: true };
    return {
      ok: false,
      msg: "Invalid Indian plate. Use formats like TN09AB1234 or 22BH1234AB",
    };
  };

  // Final publish — all vehicle fields are mandatory
  const publish = async () => {
    setError("");

    // ── Vehicle type (Car / Bike) ──
    if (!form.vehicleType) {
      setError("Please pick a vehicle type (Car or Bike)");
      return;
    }
    // ── Vehicle name / model ──
    if (!form.vehicleName || form.vehicleName.trim().length < 2) {
      setError("Please enter the vehicle model / name");
      return;
    }
    // ── Vehicle colour ──
    if (!form.vehicleColor || form.vehicleColor.trim().length < 3) {
      setError("Please enter the vehicle colour");
      return;
    }
    // ── Number plate ──
    {
      const p = validatePlate(form.plateNumber);
      if (!p.ok) {
        setError(p.msg || "Enter a valid number plate (e.g. TN09AB1234)");
        return;
      }
    }
    // ── Seats ──
    if (!form.seats || form.seats < 1 || form.seats > 8) {
      setError("Seats must be between 1 and 8");
      return;
    }

    // Re-validate time vs. NOW — the user may have spent minutes on
    // page 2 and the chosen time could now be in the past.
    if (form.date && form.time) {
      if (form.date < todayISO()) {
        setError("Date is in the past. Go back and pick a future date.");
        return;
      }
      if (form.date === todayISO() && form.time < nowHHMM()) {
        setError("Time is in the past. Go back and pick a future time.");
        return;
      }
    }

    // Distance / duration must be set (auto-calculated by the route fetcher)
    if (!distance || !duration) {
      setError("Route info is missing. Go back and let the map load.");
      return;
    }

    try {
      setPublishing(true);
      const userPhone = localStorage.getItem("phone") || "";
      const payload = {
        from: form.from.trim(),
        to: form.to.trim(),
        date: form.date,
        time: form.time,
        gender: form.gender || "Any",
        distance,
        // `duration` is REQUIRED by the backend (POST /api/rides validates
        // from, to, date, time, gender, distance AND duration). Without it
        // the publish call after payment returns HTTP 400 and the ride is
        // never saved — which is why posted rides weren't appearing in
        // FindRide. Always send the duration computed by the route fetcher.
        duration,
        fromLat: form.fromCoords?.lat ?? null,
        fromLon: form.fromCoords?.lon ?? null,
        toLat:   form.toCoords?.lat   ?? null,
        toLon:   form.toCoords?.lon   ?? null,
        userPhone,
        vehicle: form.vehicleType,
        vehicleModel: form.vehicleName.trim(),
        vehicleColor: form.vehicleColor.trim(),
        plateNumber: (form.plateNumber || "").toUpperCase().replace(/[\s-]/g, ""),
        seatsAvailable: Number(form.seats) || 1,
        additionalInfo: form.notes || "",
      };

      // Stash the payload first - the actual POST /api/rides happens
      // AFTER the user completes payment in SecurePayment. This way no
      // ride is published unless the plan payment succeeds.
      try {
        localStorage.setItem("pendingRidePayload", JSON.stringify(payload));
      } catch (e) {
        console.warn("Could not stash pendingRidePayload:", e);
      }
      // Clear any previous "lastPostedRideId" - it will be set freshly
      // once payment succeeds and the ride is actually persisted.
      try { localStorage.removeItem("lastPostedRideId"); } catch (e) {}

      // Auth + profile gate before payment
      try { localStorage.setItem("pendingPostRide", "1"); } catch (e) {}

      const phoneLooksValid = /^\+?\d{10,13}$/.test(userPhone);
      if (!phoneLooksValid) {
        console.log("Stashed payload - user not logged in, sending to /login");
        navigate("/login");
        return;
      }

      // Check profile completeness in the background
      try {
        const r = await axios.get(`${API}/api/auth/profile?phone=${encodeURIComponent(userPhone)}`, { timeout: 6000 });
        const u = r?.data?.user || r?.data || {};
        const hasProfile = !!(u.fullName && u.city);
        if (!hasProfile) {
          console.log("Stashed payload - profile incomplete, sending to /profile-setup");
          navigate("/profile-setup");
          return;
        }
      } catch (e) {
        console.warn("Profile check failed, routing through /login:", e?.message);
        navigate("/login");
        return;
      }

      console.log("Ride payload stashed - proceeding to payment");
      navigate("/plan");
    } catch (err) {
      console.error("Publish prep error:", err);
      setError(err.message || "Could not prepare your trip for publishing.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {!embedded && <Header />}
      {step === 1 ? (
        <PostPage
          form={form} setForm={setForm}
          route={route} distance={distance} duration={duration}
          routeLoading={routeLoading} error={error}
          onNext={goToVehicle}
          routeSuggestedStops={routeSuggestedStops}
          onRouteCalculated={({ distance: d, duration: t }) => {
            if (d) setDistance(d);
            if (t) setDuration(t);
          }}
          onRouteStopsCalculated={(stops) => {
            setRouteSuggestedStops(Array.isArray(stops) ? stops : []);
          }}
        />
      ) : (
        <PostRidePage
          form={form} setForm={setForm}
          onPublish={publish}
          publishing={publishing}
          error={error}
          onBack={() => setStep(1)}
        />
      )}
      {!embedded && <Footer />}
    </>
  );
}

// Haversine fallback (km) when /api/route is unreachable
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
