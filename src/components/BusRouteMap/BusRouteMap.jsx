// components/BusRouteMap/BusRouteMap.jsx
// Shared route map (From → stops → To) — now keyless (OpenStreetMap via OSMMap),
// so it works on every browser/device with no Google Maps key. Used by both the
// Bus Routes page and the Post Ride bus-number picker (single implementation).
//
// It plots whatever points have coordinates (origin, stops, destination) and
// draws the real driving line from the backend OSRM proxy when possible, else a
// straight line through the points.

import { useEffect, useState } from "react";
import axios from "axios";
import OSMMap from "../OSMMap/OSMMap";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

const msgStyle = {
  padding: "16px", textAlign: "center", color: "#6b7280", fontSize: 14,
  background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14, marginTop: 8,
};

export default function BusRouteMap({ route, height = 320 }) {
  const [line, setLine] = useState(null);

  // Ordered points with coordinates: from → stops → to.
  const points = [];
  const fromLat = num(route?.fromLat), fromLon = num(route?.fromLon);
  const toLat = num(route?.toLat), toLon = num(route?.toLon);
  if (fromLat != null && fromLon != null) points.push({ lat: fromLat, lon: fromLon, color: "#22c55e", title: route?.from || "Start" });
  (route?.stops || []).forEach((s) => {
    const la = num(s?.lat), lo = num(s?.lon);
    if (la != null && lo != null) points.push({ lat: la, lon: lo, color: "#7c3aed", title: s?.name || "" });
  });
  if (toLat != null && toLon != null) points.push({ lat: toLat, lon: toLon, color: "#ef4444", title: route?.to || "Destination" });

  // Fetch the driving geometry for the main leg (from → to) when both coords exist.
  useEffect(() => {
    if (fromLat == null || fromLon == null || toLat == null || toLon == null) { setLine(null); return; }
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/route`, { params: { fromLat, fromLng: fromLon, toLat, toLng: toLon }, timeout: 9000 })
      .then(({ data }) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.geometry) && data.geometry.length > 1) {
          setLine(data.geometry.map((c) => [c[1], c[0]]));
        }
      })
      .catch(() => {/* OSMMap connects the points with a straight line */});
    return () => { cancelled = true; };
  }, [fromLat, fromLon, toLat, toLon]);

  if (points.length < 2) {
    return (
      <div style={msgStyle}>
        Couldn’t place this route on the map, but the stop sequence above is complete.
      </div>
    );
  }

  return <OSMMap points={points} line={line} height={height} interactive lineColor="#7c3aed" />;
}
