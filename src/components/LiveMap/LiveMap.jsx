// components/LiveMap/LiveMap.jsx
// Live vehicle map — now keyless (OpenStreetMap via OSMMap), so it works on
// every browser/device with no Google Maps key. Same props as before: shows the
// vehicle's current GPS position and moves it in place as new coords arrive.

import OSMMap from "../OSMMap/OSMMap";

export default function LiveMap({ lat, lon, destLat, destLon, height = 320 }) {
  const hasVehicle = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
  const hasDest =
    Number.isFinite(Number(destLat)) && Number.isFinite(Number(destLon)) &&
    !(Number(destLat) === 0 && Number(destLon) === 0);

  const boxStyle = {
    width: "100%", height, borderRadius: 14, overflow: "hidden",
    border: "1px solid #e5e7eb", background: "#eef2f7", position: "relative",
  };

  if (!hasVehicle) {
    return (
      <div style={boxStyle}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 14, textAlign: "center", padding: 16 }}>
          Waiting for the vehicle's location…
        </div>
      </div>
    );
  }

  // The vehicle is a live (moving) marker; the destination (if any) is a static point.
  const points = hasDest ? [{ lat: destLat, lon: destLon, color: "#ef4444", title: "Destination" }] : [];
  return (
    <OSMMap
      points={points}
      live={{ lat, lon }}
      height={height}
      interactive
    />
  );
}
