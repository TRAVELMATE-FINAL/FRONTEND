// pages/BusRoutePage.jsx
// Standalone "Bus Route Details — search by bus number" screen. Completely
// separate from the ride-posting / booking workflows. Looks up an
// admin-verified route (never generated/assumed) and shows it in travel order
// with a Google map (start/end markers + sequence polyline).

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import BusRouteMap from "../components/BusRouteMap/BusRouteMap.jsx";

const API_BASE =
  import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

const normKey = (s) => String(s || "").toUpperCase().replace(/[\s-]+/g, "");

export default function BusRoutePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [route, setRoute] = useState(null);
  const [nearby, setNearby] = useState(null);     // [{ point, name, landmarks:[...] }] | null
  const [nearbyLoading, setNearbyLoading] = useState(false);
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

  // Ordered points (From → stops → To) with coordinates where available.
  const points = route
    ? [
        { name: route.from, lat: route.fromLat, lon: route.fromLon },
        ...((route.stops || []).map((s) => ({ name: s.name, lat: s.lat, lon: s.lon }))),
        { name: route.to, lat: route.toLat, lon: route.toLon },
      ].filter((p) => p.name)
    : [];

  // Fetch REAL nearby landmarks (OpenStreetMap) for the stops that have
  // coordinates — hospitals, colleges, railway/metro/bus stations, malls,
  // temples, attractions. Only verified OSM data, nothing generated.
  useEffect(() => {
    setNearby(null);
    if (!route) return;
    const withCoords = points.filter(
      (p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))
    );
    if (!withCoords.length) return;
    let cancelled = false;
    setNearbyLoading(true);
    axios
      .post(
        `${API_BASE}/api/bus-nearby`,
        { points: withCoords.map((p) => ({ lat: p.lat, lon: p.lon, name: p.name })) },
        { timeout: 25000 }
      )
      .then(({ data }) => { if (!cancelled) setNearby(Array.isArray(data?.nearby) ? data.nearby : []); })
      .catch(() => { if (!cancelled) setNearby([]); })
      .finally(() => { if (!cancelled) setNearbyLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const landmarksFor = (name) => {
    if (!Array.isArray(nearby)) return null;
    const hit = nearby.find((n) => String(n.name || "").toLowerCase() === String(name || "").toLowerCase());
    return hit ? hit.landmarks || [] : [];
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--tm-internal-bg, #f3f0fb)", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, width: "100%", maxWidth: 820, margin: "0 auto", padding: "20px 14px 48px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", margin: "6px 0 4px" }}>Bus Route Details</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 18px" }}>
          Enter a bus number to see its full route — starting point, all stops and the destination. (Chennai area)
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
                <span style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600 }}>{route.state || "Chennai"}</span>
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

            {/* Sequence (travel order) + nearby landmarks per stop */}
            <div style={{ background: "#fff", border: "1px solid #eceef6", borderRadius: 16, padding: "16px 18px", boxShadow: "0 4px 14px rgba(15,15,46,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>Complete route (in order)</div>
                {nearbyLoading && <span style={{ fontSize: 11.5, color: "#7c3aed", fontWeight: 600 }}>Loading nearby places…</span>}
              </div>
              <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {points.map((p, i) => {
                  const isStart = i === 0, isEnd = i === points.length - 1;
                  const dot = isStart ? "#22c55e" : isEnd ? "#ef4444" : "#7c3aed";
                  const lms = landmarksFor(p.name);
                  return (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "6px 0" }}>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: dot, border: "2px solid #fff", boxShadow: "0 0 0 1px " + dot }} />
                        {!isEnd && <span style={{ width: 2, height: (lms && lms.length ? 40 : 22), background: "#d1d5db", marginTop: 2 }} />}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 14, color: "#1a1a2e", fontWeight: isStart || isEnd ? 700 : 500 }}>
                          {p.name}
                          {isStart && <span style={{ color: "#16a34a", fontSize: 11, fontWeight: 700, marginLeft: 6 }}>START</span>}
                          {isEnd && <span style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, marginLeft: 6 }}>END</span>}
                        </span>
                        {/* Real nearby landmarks (OpenStreetMap) */}
                        {lms && lms.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {lms.map((lm, j) => (
                              <span key={j} title={lm.category + (lm.dist ? ` · ${lm.dist} m` : "")}
                                style={{ fontSize: 11, color: "#4b5563", background: "#f5f3ff", border: "1px solid #ece9fb", borderRadius: 999, padding: "3px 9px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <span style={{ color: "#7c3aed" }}>📍</span>{lm.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {Array.isArray(nearby) && !nearbyLoading && nearby.every((n) => !n.landmarks || !n.landmarks.length) && (
                <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 10 }}>
                  Nearby landmarks aren’t available for this route yet.
                </div>
              )}
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
