// components/LiveMap/LiveMap.jsx
// Leaflet + OpenStreetMap live map. Shows the vehicle's current position (and
// optional destination) and updates the marker in place as new coordinates
// arrive — no page refresh. Mobile-friendly.

import { useEffect, useRef } from "react";
import { loadLeaflet } from "../../utils/leaflet";

export default function LiveMap({ lat, lon, destLat, destLon, height = 320 }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const vehicleRef = useRef(null);
  const destRef = useRef(null);
  const lineRef = useRef(null);
  const LRef = useRef(null);

  // Init the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !elRef.current || mapRef.current) return;
        LRef.current = L;
        const start = [Number(lat) || 11.1271, Number(lon) || 78.6569];
        const map = L.map(elRef.current, { zoomControl: true, attributionControl: true }).setView(start, 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        mapRef.current = map;
        // Leaflet sometimes needs a size recalc after mount.
        setTimeout(() => { try { map.invalidateSize(); } catch {} }, 200);
        update(); // draw initial marker
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (mapRef.current) { try { mapRef.current.remove(); } catch {} mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move/redraw markers whenever coordinates change.
  const update = () => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    const hasVehicle = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
    const hasDest = Number.isFinite(Number(destLat)) && Number.isFinite(Number(destLon));

    if (hasVehicle) {
      const pos = [Number(lat), Number(lon)];
      if (!vehicleRef.current) {
        const icon = L.divIcon({
          className: "livemap-vehicle",
          html: '<div style="font-size:26px;line-height:1">🚌</div>',
          iconSize: [30, 30], iconAnchor: [15, 15],
        });
        vehicleRef.current = L.marker(pos, { icon }).addTo(map).bindPopup("Vehicle (live)");
      } else {
        vehicleRef.current.setLatLng(pos);
      }
    }
    if (hasDest) {
      const d = [Number(destLat), Number(destLon)];
      if (!destRef.current) {
        destRef.current = L.circleMarker(d, { radius: 8, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1 }).addTo(map).bindPopup("Destination");
      } else {
        destRef.current.setLatLng(d);
      }
    }
    if (hasVehicle && hasDest) {
      const path = [[Number(lat), Number(lon)], [Number(destLat), Number(destLon)]];
      if (!lineRef.current) lineRef.current = L.polyline(path, { color: "#7c3aed", weight: 3, dashArray: "6 6", opacity: 0.8 }).addTo(map);
      else lineRef.current.setLatLngs(path);
      try { map.fitBounds(L.latLngBounds(path).pad(0.4)); } catch {}
    } else if (hasVehicle) {
      map.panTo([Number(lat), Number(lon)]);
    }
  };

  useEffect(() => { update(); /* eslint-disable-next-line */ }, [lat, lon, destLat, destLon]);

  const hasAny = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
  return (
    <div style={{ position: "relative" }}>
      <div ref={elRef} style={{ width: "100%", height, borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb", background: "#eef2f7" }} />
      {!hasAny && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 14, pointerEvents: "none" }}>
          Waiting for the vehicle's location…
        </div>
      )}
    </div>
  );
}
