// components/OSMMap/OSMMap.jsx
// Keyless map built on Leaflet + OpenStreetMap tiles. Works on EVERY browser
// (iPhone/iPad Safari, old & new Android Chrome, Firefox, desktop) with NO
// Google Maps key, no billing and no referrer config — so it can never show the
// "Map blocked by Google" state. Leaflet is loaded once from CDN via loadLeaflet().
//
// Props (all optional except height is defaulted):
//   points   : [{ lat, lon, label?, color?, title? }]  markers in travel order
//   line     : [[lat, lon], ...]  polyline to draw; if omitted, connects points
//   live     : { lat, lon }  a moving marker (live tracking) that pans into view
//   height   : number (px) | string
//   interactive : boolean  enable drag/zoom gestures (default false = static preview)
//   lineColor : stroke colour for the route line
//
// It renders its own sized box; parents just place it.

import { useEffect, useRef } from "react";
import { loadLeaflet } from "../../utils/leaflet";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export default function OSMMap({
  points = [],
  line = null,
  live = null,
  height = 320,
  interactive = false,
  lineColor = "#7c3aed",
}) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const liveMarkerRef = useRef(null);
  const LRef = useRef(null);

  // Clean, valid points (lat/lon present).
  const pts = (points || [])
    .map((p) => ({ ...p, lat: num(p.lat ?? p.latitude), lon: num(p.lon ?? p.lng ?? p.longitude) }))
    .filter((p) => p.lat != null && p.lon != null);

  // Serialise props so the drawing effect only re-runs when something changes.
  const ptsKey = JSON.stringify(pts.map((p) => [p.lat, p.lon, p.label || "", p.color || ""]));
  const lineKey = JSON.stringify(line || []);

  // ── Create the map once Leaflet is ready and the box is in the DOM. ──
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !boxRef.current || mapRef.current) return;
        LRef.current = L;
        const map = L.map(boxRef.current, {
          zoomControl: interactive,
          dragging: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          boxZoom: interactive,
          keyboard: interactive,
          tap: interactive,
          touchZoom: interactive,
          attributionControl: true,
        });
        L.tileLayer(OSM_URL, { maxZoom: 19, attribution: OSM_ATTR }).addTo(map);
        map.setView([13.0827, 80.2707], 11); // Chennai default until points load
        mapRef.current = map;
        // Leaflet needs a size recalculation when it mounts inside a flex/hidden box.
        setTimeout(() => { try { map.invalidateSize(); } catch (_e) {} drawAll(); }, 60);
      })
      .catch(() => {/* CDN unreachable — the box just stays empty, route text still shows */});

    return () => {
      cancelled = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch (_e) {} mapRef.current = null; }
      layersRef.current = [];
      liveMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── (Re)draw markers + line whenever points/line change. ──
  const drawAll = () => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Clear previous markers/line (but keep the live marker — handled separately).
    layersRef.current.forEach((l) => { try { map.removeLayer(l); } catch (_e) {} });
    layersRef.current = [];

    const latlngs = [];

    // Route line: use the provided geometry, else connect the points in order.
    const path = Array.isArray(line) && line.length
      ? line.map((c) => [num(c[0]), num(c[1])]).filter((c) => c[0] != null && c[1] != null)
      : pts.map((p) => [p.lat, p.lon]);
    if (path.length >= 2) {
      const poly = L.polyline(path, { color: lineColor, weight: 4, opacity: 0.9 }).addTo(map);
      layersRef.current.push(poly);
      path.forEach((c) => latlngs.push(c));
    }

    // Markers (A = green start, B = red end, intermediate = purple dots).
    pts.forEach((p, i) => {
      const isStart = i === 0;
      const isEnd = i === pts.length - 1;
      const color = p.color || (isStart ? "#22c55e" : isEnd ? "#ef4444" : "#7c3aed");
      const big = isStart || isEnd;
      const m = L.circleMarker([p.lat, p.lon], {
        radius: big ? 8 : 6,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      }).addTo(map);
      if (p.title) m.bindTooltip(String(p.title), { direction: "top", offset: [0, -6] });
      layersRef.current.push(m);
      latlngs.push([p.lat, p.lon]);
    });

    if (latlngs.length === 1) {
      map.setView(latlngs[0], 14);
    } else if (latlngs.length >= 2) {
      try { map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], maxZoom: 15 }); } catch (_e) {}
    }
  };

  useEffect(() => { drawAll(); /* eslint-disable-next-line */ }, [ptsKey, lineKey]);

  // ── Live moving marker (live tracking): create once, then move it. ──
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const lat = num(live && live.lat);
    const lon = num(live && live.lon);
    if (!L || !map || lat == null || lon == null) return;
    if (!liveMarkerRef.current) {
      liveMarkerRef.current = L.circleMarker([lat, lon], {
        radius: 9, color: "#fff", weight: 3, fillColor: "#7c3aed", fillOpacity: 1,
      }).addTo(map);
      map.setView([lat, lon], 15);
    } else {
      liveMarkerRef.current.setLatLng([lat, lon]);
      map.panTo([lat, lon]);
    }
  }, [live && live.lat, live && live.lon]);

  return (
    <div
      ref={boxRef}
      style={{
        width: "100%",
        height,
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        background: "#eef2f7",
      }}
    />
  );
}
