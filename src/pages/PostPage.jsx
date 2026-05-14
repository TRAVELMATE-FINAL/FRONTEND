import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "../utils/googleMapsLoader";
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
function PostPage({ form, setForm, route, distance, duration, routeLoading, error, onNext }) {
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

  // ── Suggested stops based on the user's From / To ────────
  // Simple table of well-known intermediate cities for the most-
  // travelled Tamil-Nadu / South-India routes. If we don't have a
  // direct match, fall back to a couple of safe defaults so the chips
  // are never empty when both From + To are picked.
  const suggestedStops = (() => {
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
   (Google computes the route from fromCoords/toCoords directly). */
function RouteMap({ fromCoords, toCoords, fromName, toName, compact = false }) {
  // Compact = small inline preview (used in step 1); default = large map card.
  const mapHeight = compact ? 140 : 260;

  const { isLoaded, loadError } = useGoogleMaps();

  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const fallbackPolylineRef = useRef(null);
  const markersRef = useRef([]);
  const [routeError, setRouteError] = useState("");
  const [routeInfo, setRouteInfo] = useState({ distance: "", duration: "" });

  const haveCoords = !!(fromCoords && toCoords);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);
  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const clearMapLayers = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (fallbackPolylineRef.current) {
      fallbackPolylineRef.current.setMap(null);
      fallbackPolylineRef.current = null;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }, []);

  // Render the route whenever from/to changes
  useEffect(() => {
    if (!isLoaded || !haveCoords || !mapRef.current) return;
    const g = window.google;
    const map = mapRef.current;
    clearMapLayers();

    const directionsService = new g.maps.DirectionsService();
    const renderer = new g.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#4f6ef7",
        strokeWeight: 4,
        strokeOpacity: 0.9,
      },
      preserveViewport: false,
    });

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
      });
      markersRef.current = [from, to];
    };

    directionsService.route(
      {
        origin,
        destination,
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          renderer.setDirections(result);
          directionsRendererRef.current = renderer;
          drawAB();
          // Distance + duration from the Directions response (no extra call)
          const leg = result.routes?.[0]?.legs?.[0];
          setRouteInfo({
            distance: leg?.distance?.text || "",
            duration: leg?.duration?.text || "",
          });
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
                  setRouteInfo({
                    distance: el.distance?.text || "",
                    duration: el.duration?.text || "",
                  });
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
    haveCoords,
    fromCoords?.lat,
    fromCoords?.lon,
    toCoords?.lat,
    toCoords?.lon,
    fromName,
    toName,
    clearMapLayers,
  ]);

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
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE 2 — Vehicle details
───────────────────────────────────────── */
function PostRidePage({ form, setForm, onPublish, publishing, error, onBack, liveLabel }) {
  const fieldStyle = {
    width: "100%", border: "none", borderBottom: "1.5px solid #e8e8e8",
    outline: "none", padding: "10px 0", fontSize: 13,
    fontFamily: "'Poppins', sans-serif", color: "#333",
    background: "transparent",
  };

  const CarIcon = () => (
    <svg viewBox="0 0 48 32" width="44" height="30" fill="currentColor">
      <path d="M8 20h32l-4-10H12L8 20z" opacity="0.15"/>
      <rect x="4" y="18" width="40" height="10" rx="4"/>
      <rect x="2" y="22" width="5" height="6" rx="2"/>
      <rect x="41" y="22" width="5" height="6" rx="2"/>
      <circle cx="12" cy="28" r="4" fill="#333"/><circle cx="12" cy="28" r="2" fill="#fff"/>
      <circle cx="36" cy="28" r="4" fill="#333"/><circle cx="36" cy="28" r="2" fill="#fff"/>
      <path d="M12 18l4-10h16l4 10H12z" fill="#555"/>
      <rect x="14" y="10" width="8" height="6" rx="1" fill="#a0c4ff" opacity="0.8"/>
      <rect x="24" y="10" width="8" height="6" rx="1" fill="#a0c4ff" opacity="0.8"/>
    </svg>
  );
  const BikeIcon = () => (
    <svg viewBox="0 0 48 32" width="44" height="30" fill="none">
      <circle cx="12" cy="24" r="7" stroke="#bbb" strokeWidth="2"/>
      <circle cx="12" cy="24" r="3" fill="#bbb"/>
      <circle cx="36" cy="24" r="7" stroke="#bbb" strokeWidth="2"/>
      <circle cx="36" cy="24" r="3" fill="#bbb"/>
      <path d="M12 24 L24 12 L36 24" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 12 L28 12" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/>
      <path d="M24 12 L24 8" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div style={{ fontFamily:"'Poppins',sans-serif", background:"#f0f0f0", minHeight:"100vh", display:"flex", justifyContent:"center", padding:"24px 16px" }}>
      <div style={{ width:480, maxWidth:"100%", background:"#fff", borderRadius:16, overflow:"visible", boxShadow:"0 8px 32px rgba(0,0,0,0.12)", height:"fit-content" }}>

        <div style={{ padding:"24px 24px 16px", background:"#f8f8ff", borderBottom:"1.5px solid #f0f0f0", display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, color:"#c0bfcf", margin:0 }}>Post</h1>
            <p style={{ fontSize:12, color:"#ccc", marginTop:2 }}>Share your journey with others</p>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:11, color:"#999" }}>{liveLabel}</span>
            <button onClick={onBack} type="button" style={{ background:"transparent", border:"1.5px solid #e8e8e8", borderRadius:8, padding:"5px 11px", fontSize:12, color:"#666", cursor:"pointer" }}>← Back</button>
          </div>
        </div>

        <div style={{ margin:"20px 20px 0", background:"#fff", borderRadius:16, border:"1.5px solid #ede8ff", padding:"20px 20px 0", boxShadow:"0 2px 16px rgba(120,80,255,0.06)" }}>

          {/* Vehicle Type */}
          <div style={{ marginBottom:18 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
              <span style={{ fontSize:14 }}>🚗</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>Vehicle Type</span>
            </div>
            <div style={{ display:"flex", gap:12 }}>
              {["Car","Bike"].map((v) => {
                const active = form.vehicleType === v;
                const Icon = v === "Car" ? CarIcon : BikeIcon;
                return (
                  <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, vehicleType: v }))}
                    style={{ flex:1, border:`1.5px solid ${active?"#a78bfa":"#e8e8e8"}`, borderRadius:12, padding:"16px 10px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", background:active?"#faf5ff":"#fff", transition:"all 0.2s" }}>
                    <div style={{ color: active ? "#333" : "#bbb" }}><Icon/></div>
                    <span style={{ fontSize:13, fontWeight:500, color: active ? "#1a1a2e" : "#bbb" }}>{v}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color — required */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", marginBottom:6 }}>
              Color <span style={{ color: "#e53e3e" }}>*</span>
            </div>
            <input
              style={fieldStyle}
              placeholder="Enter Colour (e.g. White, Black)"
              value={form.vehicleColor}
              onChange={(e) => setForm((f) => ({ ...f, vehicleColor: e.target.value }))}
              required
            />
          </div>

          {/* Vehicle Name — required */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", marginBottom:6 }}>
              Vehicle Name <span style={{ color: "#e53e3e" }}>*</span>
            </div>
            <input
              style={fieldStyle}
              placeholder="e.g. Swift, Activa, Pulsar"
              value={form.vehicleName}
              onChange={(e) => setForm((f) => ({ ...f, vehicleName: e.target.value }))}
              required
            />
          </div>

          {/* Number Plate — required + Indian-format validation */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", marginBottom:6 }}>
              Number Plate <span style={{ color: "#e53e3e" }}>*</span>
            </div>
            <input
              style={fieldStyle}
              placeholder="TN09AB1234 or 22BH1234AB"
              value={form.plateNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, plateNumber: e.target.value.toUpperCase().replace(/\s+/g, "") }))
              }
              maxLength={11}
              required
            />
            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
              Indian formats: standard (TN09AB1234) or BH series (22BH1234AB)
            </div>
          </div>

          {/* Available Seats — required, 1-8 */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <span style={{ fontSize:13 }}>🪑</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>
                Available Seats <span style={{ color: "#e53e3e" }}>*</span>
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", borderBottom:"1.5px solid #e8e8e8", paddingBottom:8 }}>
              <input
                type="number"
                value={form.seats}
                min={1}
                max={8}
                onChange={(e) => setForm((f) => ({ ...f, seats: Math.max(1, Math.min(8, Number(e.target.value) || 1)) }))}
                style={{ ...fieldStyle, borderBottom:"none", width:60 }}
              />
              <div style={{ display:"flex", gap:8, marginLeft:"auto" }}>
                <button type="button" onClick={() => setForm((f) => ({ ...f, seats: Math.max(1, f.seats - 1) }))}
                  style={{ width:28, height:28, border:"1.5px solid #e8e8e8", borderRadius:6, background:"#fff", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"#555" }}>−</button>
                <button type="button" onClick={() => setForm((f) => ({ ...f, seats: Math.min(8, f.seats + 1) }))}
                  style={{ width:28, height:28, border:"1.5px solid #e8e8e8", borderRadius:6, background:"#fff", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"#555" }}>+</button>
              </div>
            </div>
          </div>

          {/* Notes & Preferences */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <span style={{ fontSize:13 }}>📋</span>
              <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>Notes & Preferences</span>
            </div>
            <textarea
              placeholder="e.g., No smoking, music lovers welcome, pet friendly..."
              value={form.notes}
              maxLength={500}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              style={{ width:"100%", border:"none", borderBottom:"1.5px solid #e8e8e8", outline:"none", fontFamily:"'Poppins',sans-serif", fontSize:13, color:"#333", resize:"none", height:90, background:"transparent", paddingTop:4, boxSizing:"border-box" }}
            />
          </div>
        </div>

        {error && (
          <div style={{ margin:"12px 20px 0", background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 14px", fontSize:13 }}>
            {error}
          </div>
        )}

        <div style={{ padding:"20px 20px 24px" }}>
          <button onClick={onPublish} type="button" disabled={publishing}
            style={{ width:"100%", background: publishing ? "#f5d56a" : "#f5c518", border:"none", borderRadius:10, padding:14, fontSize:16, fontWeight:600, fontFamily:"'Poppins',sans-serif", color:"#1a1a2e", cursor: publishing ? "not-allowed" : "pointer" }}>
            {publishing ? "Publishing…" : "Publish Ride"}
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

  // Live "Now: HH:MM • DD/MM/YYYY" — ticks every minute
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  const liveLabel = useMemo(() => formatPretty(now), [now]);

  // Auto-fetch route when both coordinates are picked
  const [route, setRoute] = useState([]);     // [[lat,lon],...]
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);

  const lastReqRef = useRef("");

  useEffect(() => {
    const f = form.fromCoords, t = form.toCoords;
    if (!f || !t) {
      setRoute([]); setDistance(""); setDuration("");
      return;
    }
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

      // Stash the payload first — the actual POST /api/rides happens
      // AFTER the user completes payment in SecurePayment. This way no
      // ride is published unless the plan payment succeeds.
      try {
        localStorage.setItem("pendingRidePayload", JSON.stringify(payload));
      } catch (e) {
        console.warn("Could not stash pendingRidePayload:", e);
      }
      // Clear any previous "lastPostedRideId" — it will be set freshly
      // once payment succeeds and the ride is actually persisted.
      try { localStorage.removeItem("lastPostedRideId"); } catch (e) {}

      // ── Auth + profile gate before payment ────────────────────
      // The poster must be:
      //   1. Logged in  (localStorage.phone exists, looks like a phone)
      //   2. Have a saved profile (fullName + city in /auth/profile)
      // If either is missing, breadcrumb the post-ride intent and send
      // them through the existing /login → /otp → /profile-setup →
      // /plan chain. That chain reads `pendingPostRide` to deliver
      // them back to the payment step automatically.
      try { localStorage.setItem("pendingPostRide", "1"); } catch (e) {}

      const phoneLooksValid = /^\+?\d{10,13}$/.test(userPhone);
      if (!phoneLooksValid) {
        console.log("📦 Stashed payload — user not logged in, sending to /login");
        navigate("/login");
        return;
      }

      // Check profile completeness in the background
      try {
        const r = await axios.get(`${API}/api/auth/profile?phone=${encodeURIComponent(userPhone)}`, { timeout: 6000 });
        const u = r?.data?.user || r?.data || {};
        const hasProfile = !!(u.fullName && u.city);
        if (!hasProfile) {
          console.log("📦 Stashed payload — profile incomplete, sending to /profile-setup");
          navigate("/profile-setup");
          return;
        }
      } catch (e) {
        // If the profile endpoint fails, default to forcing setup
        // rather than letting an unverified user post.
        console.warn("Profile check failed, routing through /login:", e?.message);
        navigate("/login");
        return;
      }

      console.log("📦 Ride payload stashed — proceeding to payment");
      navigate("/plan");
    } catch (err) {
      console.error("❌ Publish prep error:", err);
      setError(err.message || "Could not prepare ride for publishing.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      {/* Show the shared Header only when this page is rendered standalone
          via the /post-ride route. When embedded inside FindRide the parent
          already renders its own Header, so we suppress this one. */}
      {!embedded && <Header />}
      {step === 1 ? (
        <PostPage
          form={form} setForm={setForm}
          route={route} distance={distance} duration={duration}
          routeLoading={routeLoading} error={error}
          onNext={goToVehicle}
          liveLabel={liveLabel}
        />
      ) : (
        <PostRidePage
          form={form} setForm={setForm}
          onPublish={publish}
          publishing={publishing}
          error={error}
          onBack={() => setStep(1)}
          liveLabel={liveLabel}
        />
      )}

      {/* Show Footer only when this page is rendered standalone via the
          /post-ride route. When embedded inside FindRide (mode=post)
          the parent already renders its own Footer. */}
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