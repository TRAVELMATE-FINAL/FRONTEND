// components/BusRouteMap/BusRouteMap.jsx
// Keyless route map (OpenStreetMap via OSMMap). Plots From → stops → To.
//
// Bus routes created in the admin often DON'T have coordinates stored on every
// stop. So here we resolve each stop's coordinates: use the stored lat/lon when
// present, otherwise GEOCODE the stop name via our own server (/api/geocode →
// OpenStreetMap Nominatim), cached in localStorage so it's instant next time.
// This is why the map was blank for routes whose stops had no coordinates.

import { useEffect, useState } from "react";
import axios from "axios";
import OSMMap from "../OSMMap/OSMMap";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const inIndia = (la, lo) => la != null && lo != null && la >= 6 && la <= 37 && lo >= 68 && lo <= 98;

const msgStyle = {
  padding: "16px", textAlign: "center", color: "#6b7280", fontSize: 14,
  background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14,
};

// ── Geocode cache (memory + localStorage) so a stop name is looked up once. ──
const geoMem = new Map();
function geoGet(name) {
  const k = "vgeo:" + name.toLowerCase();
  if (geoMem.has(k)) return geoMem.get(k);
  try { const r = localStorage.getItem(k); if (r) { const v = JSON.parse(r); geoMem.set(k, v); return v; } } catch {}
  return undefined;
}
function geoSet(name, v) {
  const k = "vgeo:" + name.toLowerCase();
  geoMem.set(k, v);
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}
async function geocodeName(name) {
  const cached = geoGet(name);
  if (cached !== undefined) return cached; // may be null (known-not-found)
  try {
    const { data } = await axios.get(`${API_BASE}/api/geocode`, {
      params: { q: `${name}, Chennai, Tamil Nadu, India` }, timeout: 9000,
    });
    const v = (data && inIndia(num(data.lat), num(data.lon)))
      ? { lat: num(data.lat), lon: num(data.lon) }
      : null;
    geoSet(name, v);
    return v;
  } catch {
    return null; // don't cache transient errors
  }
}

export default function BusRouteMap({ route, height = 320 }) {
  const [points, setPoints] = useState([]);
  const [line, setLine] = useState(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!route) { setPoints([]); setLine(null); return; }
      // Ordered sequence (From → stops → To) with stored coords where present.
      const seq = [
        { name: route.from, lat: num(route.fromLat), lon: num(route.fromLon), color: "#22c55e", title: route.from },
        ...((route.stops || []).map((s) => ({ name: s.name, lat: num(s.lat), lon: num(s.lon), color: "#7c3aed", title: s.name }))),
        { name: route.to, lat: num(route.toLat), lon: num(route.toLon), color: "#ef4444", title: route.to },
      ].filter((p) => p.name);

      setResolving(true);
      const resolved = [];
      for (const p of seq) {
        let lat = p.lat, lon = p.lon;
        if (!inIndia(lat, lon)) {
          const g = await geocodeName(p.name); // cached; sequential to be gentle on the geocoder
          if (g) { lat = g.lat; lon = g.lon; }
        }
        if (inIndia(lat, lon)) resolved.push({ ...p, lat, lon });
      }
      if (cancelled) return;
      setPoints(resolved);
      setResolving(false);

      // Draw the real driving line between the first and last resolved points.
      if (resolved.length >= 2) {
        const a = resolved[0], b = resolved[resolved.length - 1];
        try {
          const { data } = await axios.get(`${API_BASE}/api/route`, {
            params: { fromLat: a.lat, fromLng: a.lon, toLat: b.lat, toLng: b.lon }, timeout: 9000,
          });
          if (!cancelled && data && Array.isArray(data.geometry) && data.geometry.length > 1) {
            setLine(data.geometry.map((c) => [c[1], c[0]]));
          }
        } catch { /* OSMMap connects the points with a straight line */ }
      }
    })();
    return () => { cancelled = true; };
  }, [route]);

  if (!resolving && points.length < 2) {
    return (
      <div style={msgStyle}>
        Couldn’t place this route on the map, but the stop sequence above is complete.
      </div>
    );
  }

  return <OSMMap points={points} line={line} height={height} interactive lineColor="#7c3aed" />;
}
