import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { formatTime12h } from "../utils/time.js";
import LocationSearch from "../components/LocationSearch/LocationSearch";

const API = import.meta.env.VITE_APP_URL || "http://localhost:5000";

// Auto-fit map to the route bounds (re-fits whenever coords change)
function FitRoute({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 1) {
      map.fitBounds(coords, { padding: [30, 30] });
    }
  }, [coords, map]);
  return null;
}

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
   PAGE 1 — Post (route + datetime + gender)
───────────────────────────────────────── */
function PostPage({ form, setForm, route, distance, duration, routeLoading, error, onNext, liveLabel }) {
  const [stopInput, setStopInput] = useState("");

  const addStop = () => {
    if (stopInput.trim()) {
      setForm((f) => ({ ...f, stops: [...f.stops, stopInput.trim()] }));
      setStopInput("");
    }
  };
  const removeStop = (i) =>
    setForm((f) => ({ ...f, stops: f.stops.filter((_, idx) => idx !== i) }));

  const minTimeAttr = form.date === todayISO() ? nowHHMM() : "00:00";

  return (
    <div style={{ fontFamily:"'Poppins',sans-serif", background:"#f0f0f0", minHeight:"100vh", display:"flex", justifyContent:"center", padding:"24px 16px" }}>
      <div className="post-page-card" style={{ width:480, maxWidth:"100%", background:"#fff", borderRadius:16, overflow:"visible", boxShadow:"0 8px 32px rgba(0,0,0,0.12)", height:"fit-content" }}>

        {/* Header */}
        <div style={{ padding:"24px 24px 8px" }}>
          <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
            <h1 style={{ fontSize:22, fontWeight:700, color:"#1a1a2e", margin:0 }}>Post</h1>
            <span style={{ fontSize:11, color:"#888" }}>{liveLabel}</span>
          </div>
          <p style={{ fontSize:13, color:"#888", marginTop:2 }}>Share your journey with others</p>
        </div>

        {/* From / To with TN districts autocomplete */}
        <div style={{ padding:"12px 24px 0" }}>
          <div style={{ border:"1.5px solid #e8e8e8", borderRadius:12, overflow:"visible", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", padding:"10px 14px", borderBottom:"1.5px solid #f0f0f0" }}>
              <div style={dot("#4f6ef7")}/>
              <div style={{ flex:1 }}>
                <LocationSearch
                  placeholder="Starting location (Tamil Nadu)"
                  value={form.from}
                  onChange={(v) => setForm((f) => ({ ...f, from: v, fromCoords: null }))}
                  onSelect={(item) => setForm((f) => ({ ...f, from: item.display_name, fromCoords: { lat: item.lat, lon: item.lon } }))}
                />
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", padding:"10px 14px" }}>
              <div style={dot("#22c55e")}/>
              <div style={{ flex:1 }}>
                <LocationSearch
                  placeholder="Destination (Tamil Nadu)"
                  value={form.to}
                  onChange={(v) => setForm((f) => ({ ...f, to: v, toCoords: null }))}
                  onSelect={(item) => setForm((f) => ({ ...f, to: item.display_name, toCoords: { lat: item.lat, lon: item.lon } }))}
                />
              </div>
            </div>
          </div>

          {/* Date + Time — live values, no past allowed */}
          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{ flex:1, border:"1.5px solid #e8e8e8", borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14 }}>📅</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>Date</div>
                <input
                  type="date"
                  value={form.date}
                  min={todayISO()}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  style={{ ...inputBase, fontSize:13 }}
                />
              </div>
            </div>
            <div style={{ flex:1, border:"1.5px solid #e8e8e8", borderRadius:10, padding:"10px 12px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14 }}>🕐</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>Time</div>
                <Time12Picker
                  value={form.time}
                  min={minTimeAttr}
                  onChange={(v) => setForm((f) => ({ ...f, time: v }))}
                />
              </div>
            </div>
          </div>

          {/* Gender */}
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            {["Male","Female"].map((g) => {
              const active = form.gender === g;
              return (
                <button key={g} type="button"
                  onClick={() => setForm((f) => ({ ...f, gender: g }))}
                  style={{ display:"flex", alignItems:"center", gap:6, border:`1.5px solid ${active?"#4f6ef7":"#e8e8e8"}`, borderRadius:20, padding:"7px 18px", fontSize:13, fontFamily:"'Poppins',sans-serif", cursor:"pointer", background:active?"#f0f3ff":"#fff", color:active?"#4f6ef7":"#444", fontWeight:500 }}>
                  👤 {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Route — auto-filled from /api/route */}
        <div style={{ padding:"0 24px 10px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", marginBottom:6 }}>Confirm your route</div>
          <div style={{ border:"1.5px solid #e8e8e8", borderRadius:12, overflow:"visible", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderBottom:"1.5px solid #f0f0f0", gap:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
                <div style={{ width:22, height:22, borderRadius:"50%", background:"#4f6ef7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>A</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:10, color:"#aaa" }}>From</div>
                  <div style={{ fontSize:13, color:"#1a1a2e", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{form.from || "—"}</div>
                </div>
              </div>
              <span style={{ color:"#bbb", fontSize:18, flexShrink:0 }}>→</span>
              <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:0 }}>
                <div style={{ textAlign:"right", minWidth:0 }}>
                  <div style={{ fontSize:10, color:"#aaa" }}>To</div>
                  <div style={{ fontSize:13, color:"#1a1a2e", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{form.to || "—"}</div>
                </div>
                <div style={{ width:22, height:22, borderRadius:"50%", background:"#22c55e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>B</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:24, padding:"8px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#555" }}>
                <span>🕐</span> {routeLoading ? "calculating…" : (duration || "—")}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#555" }}>
                <span>📍</span> {routeLoading ? "calculating…" : (distance || "—")}
              </div>
            </div>
            <RouteMap
              coords={route}
              fromCoords={form.fromCoords}
              toCoords={form.toCoords}
              fromName={form.from}
              toName={form.to}
            />
          </div>
        </div>

        {/* Stopovers */}
        <div style={{ padding:"0 24px 10px" }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e", marginBottom:6 }}>
            Add stopovers <span style={{ fontSize:11, color:"#aaa", fontWeight:400 }}>(optional)</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <div style={{ flex:1, border:"1.5px solid #e8e8e8", borderRadius:20, padding:"9px 14px", display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:14, color:"#bbb" }}>📍</span>
              <input style={inputBase} placeholder="Add a stop along the way" value={stopInput}
                onChange={(e) => setStopInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStop()} />
            </div>
            <button type="button" onClick={addStop} style={{ width:32, height:32, background:"#4f6ef7", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"none", cursor:"pointer", color:"#fff", fontSize:20, flexShrink:0 }}>+</button>
          </div>
          {form.stops.length > 0 && (
            <>
              <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>Stops</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
                {form.stops.map((s, i) => (
                  <button key={i} onClick={() => removeStop(i)} type="button"
                    title="Click to remove"
                    style={{ border:"1.5px solid #e8e8e8", borderRadius:16, padding:"4px 13px", fontSize:12, color:"#555", background:"#fff", cursor:"pointer" }}>
                    {s} ×
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {error && (
          <div style={{ margin:"0 24px 12px", background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"10px 14px", fontSize:13 }}>
            {error}
          </div>
        )}

        <button onClick={onNext} type="button"
          style={{ width:"calc(100% - 48px)", margin:"0 24px 24px", display:"block", background:"#f5c518", border:"none", borderRadius:10, padding:14, fontSize:16, fontWeight:600, fontFamily:"'Poppins',sans-serif", color:"#1a1a2e", cursor:"pointer" }}>
          Next
        </button>
      </div>
    </div>
  );
}

/* Real OpenStreetMap with the actual road geometry from /api/route */
function RouteMap({ coords, fromCoords, toCoords, fromName, toName }) {
  // Empty placeholder while user is still picking locations
  if ((!coords || coords.length < 2) && (!fromCoords || !toCoords)) {
    return (
      <div style={{ position: "relative", width: "100%", height: 220, background: "linear-gradient(135deg,#dbeafe 0%,#dcfce7 100%)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:12, color:"#64748b" }}>Pick From and To to see the route</div>
      </div>
    );
  }

  // Initial center — midpoint between A and B
  const center = fromCoords && toCoords
    ? [(fromCoords.lat + toCoords.lat) / 2, (fromCoords.lon + toCoords.lon) / 2]
    : (coords && coords.length ? coords[0] : [11.0, 78.5]); // fallback: TN center

  return (
    <div style={{ width: "100%", height: 220, position: "relative" }}>
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit to the route once it loads */}
        {coords && coords.length > 1 && <FitRoute coords={coords} />}

        {/* Blue road polyline */}
        {coords && coords.length > 1 && (
          <Polyline
            positions={coords}
            pathOptions={{ color: "#4f6ef7", weight: 4, opacity: 0.9 }}
          />
        )}

        {/* From marker (A) */}
        {fromCoords && (
          <CircleMarker
            center={[fromCoords.lat, fromCoords.lon]}
            radius={8}
            pathOptions={{ color: "#fff", fillColor: "#4f6ef7", fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <b style={{ fontSize: 11 }}>{fromName || "From"}</b>
            </Tooltip>
          </CircleMarker>
        )}

        {/* To marker (B) */}
        {toCoords && (
          <CircleMarker
            center={[toCoords.lat, toCoords.lon]}
            radius={8}
            pathOptions={{ color: "#fff", fillColor: "#22c55e", fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]}>
              <b style={{ fontSize: 11 }}>{toName || "To"}</b>
            </Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
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
export default function TravelMatePost() {
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

      console.log("📤 Publish payload:", payload);
      const res = await axios.post(`${API}/api/rides`, payload);
      console.log("✅ Publish response:", res.data);

      // Save the just-posted ride id so /ride-live can fetch it back
      const newId = res.data?.data?._id || res.data?.data?.id || "";
      if (newId) {
        try { localStorage.setItem("lastPostedRideId", newId); } catch (e) {}
      }
      navigate("/plan");
    } catch (err) {
      console.error("❌ Publish error:", err);

      const apiMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.errors) && err.response.data.errors.join(", ")) ||
        "";
      const status  = err.response?.status;
      const network = err.code === "ERR_NETWORK" || err.message === "Network Error";

      if (network) {
        setError(`Backend not reachable at ${API}. Check VITE_APP_URL or that the server is running.`);
      } else if (apiMsg) {
        setError(`${apiMsg}${status ? ` (HTTP ${status})` : ""}`);
      } else {
        setError(err.message || "Could not publish ride");
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"/>
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