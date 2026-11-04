// pages/BusRoutePage.jsx
// Standalone "Bus Route Details — search by bus number" screen. Completely
// separate from the ride-posting / booking workflows. Looks up an
// admin-verified route (never generated/assumed) and shows it in travel order
// with a Google map (start/end markers + sequence polyline).

import { useState, useRef, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { GoogleMap } from "@react-google-maps/api";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import { useGoogleMaps, useMapsAuthFailed } from "../utils/googleMapsLoader";

const API_BASE =
  import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

const normKey = (s) => String(s || "").toUpperCase().replace(/[\s-]+/g, "");

// ── Geocode cache (module-level + localStorage) so repeated searches / stops
// never re-hit the Geocoder for the same place name. ──
const geoMem = new Map();
function geoCacheGet(name) {
  const k = "busgeo:" + name.toLowerCase();
  if (geoMem.has(k)) return geoMem.get(k);
  try {
    const raw = localStorage.getItem(k);
    if (raw) { const v = JSON.parse(raw); geoMem.set(k, v); return v; }
  } catch {}
  return null;
}
function geoCacheSet(name, val) {
  const k = "busgeo:" + name.toLowerCase();
  geoMem.set(k, val);
  try { localStorage.setItem(k, JSON.stringify(val)); } catch {}
}

// ── Map that plots the full route in sequence ──────────────────────────────
function BusRouteMap({ route }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const authFailed = useMapsAuthFailed();
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const [status, setStatus] = useState("idle"); // idle | plotting | ok | nocoords

  const clear = useCallback(() => {
    layersRef.current.forEach((l) => { try { l.setMap(null); } catch {} });
    layersRef.current = [];
  }, []);

  // Build the ordered list of stops to plot: From → intermediate stops → To.
  const sequence = useCallback(() => {
    const seq = [];
    seq.push({ name: route.from, lat: route.fromLat, lon: route.fromLon, kind: "start" });
    (route.stops || []).forEach((s) =>
      seq.push({ name: s.name, lat: s.lat, lon: s.lon, kind: "mid" })
    );
    seq.push({ name: route.to, lat: route.toLat, lon: route.toLon, kind: "end" });
    return seq;
  }, [route]);

  const geocode = useCallback((geocoder, name) => {
    return new Promise((resolve) => {
      const cached = geoCacheGet(name);
      if (cached) return resolve(cached);
      geocoder.geocode(
        { address: `${name}, Tamil Nadu, India`, componentRestrictions: { country: "IN" } },
        (res, st) => {
          const OK = window.google.maps.GeocoderStatus?.OK || "OK";
          if (st === OK && res && res[0]) {
            const loc = res[0].geometry.location;
            const v = { lat: loc.lat(), lon: loc.lng() };
            geoCacheSet(name, v);
            resolve(v);
          } else {
            resolve(null);
          }
        }
      );
    });
  }, []);

  const mk = useCallback((map, pos, color, label, scale, title) => {
    const g = window.google;
    const marker = new g.maps.Marker({
      position: pos, map, title: title || "",
      label,
      icon: { path: g.maps.SymbolPath.CIRCLE, scale, fillColor: color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      zIndex: 3,
    });
    layersRef.current.push(marker);
  }, []);

  const onMapLoad = useCallback(async (map) => {
    mapRef.current = map;
    const g = window.google;
    clear();
    setStatus("plotting");

    const REGION = ", Tamil Nadu, India";
    const origin = String(route.from || "").trim() + REGION;
    const destination = String(route.to || "").trim() + REGION;
    const stopNames = (route.stops || []).map((s) => s.name).filter(Boolean);
    const waypoints = stopNames.slice(0, 23).map((name) => ({ location: name + REGION, stopover: true }));

    // ── 1) Preferred: a real road route via Directions. It geocodes the place
    // names itself (no separate Geocoding API needed) and returns an actual
    // road path, which is far more reliable than geocoding each ALL-CAPS name. ──
    const ds = new g.maps.DirectionsService();
    const routeReq = (wp) => new Promise((resolve) => {
      ds.route(
        { origin, destination, waypoints: wp, optimizeWaypoints: false, travelMode: g.maps.TravelMode.DRIVING },
        (res, st) => resolve(st === "OK" ? res : null)
      );
    });
    let result = await routeReq(waypoints);
    if (!result && waypoints.length) result = await routeReq([]); // one bad stop name can fail the whole route → retry direct

    if (result && result.routes && result.routes[0]) {
      const renderer = new g.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: false, // auto-fit to the route
        polylineOptions: { strokeColor: "#7c3aed", strokeWeight: 5, strokeOpacity: 0.9 },
      });
      renderer.setDirections(result);
      layersRef.current.push(renderer); // renderer.setMap(null) on cleanup
      const legs = result.routes[0].legs || [];
      if (legs.length) {
        mk(map, legs[0].start_location, "#22c55e", { text: "A", color: "#fff", fontSize: "11px", fontWeight: "700" }, 9, route.from);
        for (let i = 0; i < legs.length - 1; i++) mk(map, legs[i].end_location, "#7c3aed", undefined, 6); // stop markers
        mk(map, legs[legs.length - 1].end_location, "#ef4444", { text: "B", color: "#fff", fontSize: "11px", fontWeight: "700" }, 9, route.to);
      }
      setStatus("ok");
      return;
    }

    // ── 2) Fallback: geocode from/to/stops ourselves, markers + straight line. ──
    const seq = sequence();
    const geocoder = new g.maps.Geocoder();
    const points = [];
    for (const s of seq) {
      let lat = Number(s.lat), lon = Number(s.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        const geo = await geocode(geocoder, s.name);
        if (geo) { lat = geo.lat; lon = geo.lon; }
      }
      if (Number.isFinite(lat) && Number.isFinite(lon)) points.push({ lat, lng: lon, name: s.name, kind: s.kind });
    }
    if (points.length < 2) { setStatus("nocoords"); return; }

    const bounds = new g.maps.LatLngBounds();
    points.forEach((p, i) => {
      const isStart = i === 0, isEnd = i === points.length - 1;
      const color = isStart ? "#22c55e" : isEnd ? "#ef4444" : "#7c3aed";
      mk(map, { lat: p.lat, lng: p.lng }, color,
        isStart ? { text: "A", color: "#fff", fontSize: "11px", fontWeight: "700" }
        : isEnd ? { text: "B", color: "#fff", fontSize: "11px", fontWeight: "700" } : undefined,
        isStart || isEnd ? 9 : 6, p.name);
      bounds.extend({ lat: p.lat, lng: p.lng });
    });
    const line = new g.maps.Polyline({
      path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
      map, strokeColor: "#7c3aed", strokeOpacity: 0.9, strokeWeight: 4,
    });
    layersRef.current.push(line);
    map.fitBounds(bounds, 40);
    setStatus("ok");
  }, [route, sequence, geocode, clear, mk]);

  if (loadError || authFailed) {
    return <div style={mapMsgStyle}>Map unavailable right now — the route details above are still accurate.</div>;
  }
  if (!isLoaded) {
    return <div style={mapMsgStyle}>Loading map…</div>;
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ width: "100%", height: 320, borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={{ lat: 11.1271, lng: 78.6569 }} // Tamil Nadu centroid; fitBounds overrides
          zoom={7}
          options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true, gestureHandling: "greedy", clickableIcons: false }}
          onLoad={onMapLoad}
          onUnmount={() => { clear(); mapRef.current = null; }}
        />
      </div>
      {status === "nocoords" && (
        <div style={{ ...mapMsgStyle, marginTop: 8 }}>
          Couldn’t place this route on the map, but the stop sequence above is complete.
        </div>
      )}
    </div>
  );
}

const mapMsgStyle = {
  padding: "16px", textAlign: "center", color: "#6b7280", fontSize: 14,
  background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14,
};

export default function BusRoutePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [route, setRoute] = useState(null);
  const lastKeyRef = useRef("");          // de-dupe: don't refetch the same number
  const cacheRef = useRef(new Map());     // cache fetched routes this session

  const search = async () => {
    const key = normKey(query);
    setError("");
    if (!key) { setError("Please enter a bus number."); setRoute(null); return; }
    if (key === lastKeyRef.current && (route || error)) return; // already showing this
    lastKeyRef.current = key;

    // Serve from session cache if we fetched it before.
    if (cacheRef.current.has(key)) {
      setRoute(cacheRef.current.get(key));
      return;
    }
    setLoading(true);
    setRoute(null);
    try {
      const { data } = await axios.get(
        `${API_BASE}/api/bus-routes/${encodeURIComponent(key)}`,
        { timeout: 9000 }
      );
      if (data?.success && data.data) {
        cacheRef.current.set(key, data.data);
        setRoute(data.data);
      } else {
        setError(data?.message || "No route found for this bus number.");
      }
    } catch (e) {
      if (e.response?.status === 404) {
        setError(e.response?.data?.message || `No route found for bus number "${query.trim()}".`);
      } else {
        setError("Couldn’t fetch the bus route. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Ordered sequence for the text list: From → stops → To.
  const sequence = route
    ? [route.from, ...((route.stops || []).map((s) => s.name)), route.to].filter(Boolean)
    : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--tm-internal-bg, #f3f0fb)", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, width: "100%", maxWidth: 820, margin: "0 auto", padding: "20px 14px 48px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", margin: "6px 0 4px" }}>Bus Route Details</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 18px" }}>
          Enter a bus number to see its full route — starting point, all stops and the destination. (Tamil Nadu routes)
        </p>

        {/* Search */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            inputMode="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="Enter bus number (e.g. 138, TN 47 N)"
            style={{
              flex: "1 1 220px", minWidth: 0, height: 50, padding: "0 16px",
              border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 15,
              background: "#fff", outline: "none", color: "#111827", boxSizing: "border-box",
            }}
          />
          <button
            type="button"
            onClick={search}
            disabled={loading}
            style={{
              height: 50, padding: "0 24px", border: "none", borderRadius: 12,
              background: "#f5c518", color: "#111", fontWeight: 800, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer", flex: "0 0 auto",
              boxShadow: "0 4px 12px rgba(245,197,24,0.3)",
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, background: "#fef2f2", border: "1px solid #fecaca",
            color: "#b91c1c", borderRadius: 12, padding: "14px 16px", fontSize: 14, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {/* Result */}
        {route && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Summary card */}
            <div style={{ background: "#fff", border: "1px solid #eceef6", borderRadius: 16, padding: "18px 18px", boxShadow: "0 4px 14px rgba(15,15,46,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{ background: "#1a1a2e", color: "#fff", fontWeight: 800, fontSize: 15, padding: "6px 12px", borderRadius: 10, letterSpacing: "0.5px" }}>
                  Bus {route.busNumber}
                </span>
                {route.operator && (
                  <span style={{ background: "#f3effe", color: "#7c3aed", fontWeight: 700, fontSize: 12, padding: "5px 10px", borderRadius: 999 }}>
                    {route.operator}
                  </span>
                )}
                <span style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600 }}>{route.state || "Tamil Nadu"}</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 14 }}>
                <div><span style={{ color: "#6b7280" }}>From: </span><strong style={{ color: "#166534" }}>{route.from}</strong></div>
                <div><span style={{ color: "#6b7280" }}>To: </span><strong style={{ color: "#991b1b" }}>{route.to}</strong></div>
              </div>
              {(route.stops || []).length > 0 && (
                <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>
                  <span style={{ color: "#6b7280" }}>Via: </span>
                  {(route.stops || []).map((s) => s.name).join(" • ")}
                </div>
              )}
              {route.notes && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: "#9ca3af" }}>ℹ {route.notes}</div>
              )}
            </div>

            {/* Sequence (travel order) */}
            <div style={{ background: "#fff", border: "1px solid #eceef6", borderRadius: 16, padding: "16px 18px", boxShadow: "0 4px 14px rgba(15,15,46,0.05)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 12 }}>Complete route (in order)</div>
              <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {sequence.map((name, i) => {
                  const isStart = i === 0, isEnd = i === sequence.length - 1;
                  const dot = isStart ? "#22c55e" : isEnd ? "#ef4444" : "#7c3aed";
                  return (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "6px 0" }}>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: dot, border: "2px solid #fff", boxShadow: "0 0 0 1px " + dot }} />
                        {!isEnd && <span style={{ width: 2, height: 22, background: "#d1d5db", marginTop: 2 }} />}
                      </span>
                      <span style={{ fontSize: 14, color: "#1a1a2e", fontWeight: isStart || isEnd ? 700 : 500, paddingTop: 0 }}>
                        {name}
                        {isStart && <span style={{ color: "#16a34a", fontSize: 11, fontWeight: 700, marginLeft: 6 }}>START</span>}
                        {isEnd && <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, marginLeft: 6 }}>END</span>}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Map */}
            <div style={{ background: "#fff", border: "1px solid #eceef6", borderRadius: 16, padding: "14px", boxShadow: "0 4px 14px rgba(15,15,46,0.05)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#111827", marginBottom: 10, padding: "0 4px" }}>Route map</div>
              <BusRouteMap route={route} />
            </div>

            {/* Continue to Post Ride */}
            <div style={{ background: "#fff", border: "1px solid #eceef6", borderRadius: 16, padding: "16px 18px", boxShadow: "0 4px 14px rgba(15,15,46,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#14163a" }}>Travelling this route?</div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>Post your own ride and share the journey.</div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/post-ride")}
                style={{
                  flexShrink: 0, background: "#f5c518", color: "#111", border: "none",
                  borderRadius: 12, padding: "12px 20px", fontWeight: 800, fontSize: 14,
                  cursor: "pointer", boxShadow: "0 4px 12px rgba(245,197,24,0.3)",
                }}
              >
                Post a Ride →
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
