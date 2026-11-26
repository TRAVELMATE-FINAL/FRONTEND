// components/RideMap/RideMap.jsx
// Route preview for a ride card / detail — now keyless (OpenStreetMap via OSMMap)
// so it works on every browser/device with no Google Maps key. Draws the real
// driving route (from the backend OSRM proxy /api/route) between the ride's
// from/to, with A/B markers and a distance/duration overlay. Same prop shape as
// before: expects `ride` with fromLat/fromLon/toLat/toLon (+ optional stops[]).

import { useEffect, useState } from "react";
import axios from "axios";
import OSMMap from "../OSMMap/OSMMap";
import "./RideMap.css";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export default function RideMap({ ride, interactive = false }) {
  const fromLat = num(ride?.fromLat), fromLon = num(ride?.fromLon);
  const toLat = num(ride?.toLat), toLon = num(ride?.toLon);
  const haveCoords = fromLat != null && fromLon != null && toLat != null && toLon != null;

  const [line, setLine] = useState(null);
  const [info, setInfo] = useState({ distance: ride?.distance || "", duration: ride?.duration || "" });

  // Fetch the real driving geometry + distance/duration from our OSRM proxy.
  useEffect(() => {
    if (!haveCoords) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/route`, {
        params: { fromLat, fromLng: fromLon, toLat, toLng: toLon },
        timeout: 9000,
      })
      .then(({ data }) => {
        if (cancelled || !data) return;
        // OSRM geometry is [[lon,lat], ...] → convert to [[lat,lon], ...].
        if (Array.isArray(data.geometry) && data.geometry.length > 1) {
          setLine(data.geometry.map((c) => [c[1], c[0]]));
        }
        if (data.distance || data.duration) {
          setInfo({ distance: data.distance || "", duration: data.duration || "" });
        }
      })
      .catch(() => {/* straight line fallback is drawn by OSMMap from the points */});
    return () => { cancelled = true; };
  }, [haveCoords, fromLat, fromLon, toLat, toLon]);

  if (!haveCoords) {
    return (
      <div className="ridemap ridemap--empty">
        <div className="ridemap__empty-text">Route preview unavailable</div>
      </div>
    );
  }

  // Build the ordered points: from → (stops with coords) → to.
  const stops = Array.isArray(ride?.stops)
    ? ride.stops
        .map((s) => ({ lat: num(s?.lat), lon: num(s?.lon), title: (s && s.name) || "" }))
        .filter((s) => s.lat != null && s.lon != null)
    : [];
  const points = [
    { lat: fromLat, lon: fromLon, label: "A", color: "#22c55e", title: ride?.from || "Start" },
    ...stops.map((s) => ({ ...s, color: "#7c3aed" })),
    { lat: toLat, lon: toLon, label: "B", color: "#ef4444", title: ride?.to || "Destination" },
  ];

  return (
    <div className="ridemap">
      <OSMMap points={points} line={line} height="100%" interactive={interactive} lineColor="#FFD93D" />
      {(info.distance || info.duration) && (
        <div className="ridemap__info">
          {info.distance && (
            <span className="ridemap__info-item"><span className="ridemap__info-icon">📍</span>{info.distance}</span>
          )}
          {info.duration && (
            <span className="ridemap__info-item"><span className="ridemap__info-icon">⏱</span>{info.duration}</span>
          )}
        </div>
      )}
    </div>
  );
}
