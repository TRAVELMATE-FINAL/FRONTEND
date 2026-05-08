// components/RideMap/RideMap.jsx
// Mini OSM map for each ride card on the FindFriends page.
// Fetches the actual driving route via /api/route once on mount,
// draws polyline + start/end markers, auto-fits bounds.

import { useEffect, useState } from "react";
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
import "./RideMap.css";

const API_BASE = import.meta.env.VITE_APP_URL || "http://localhost:5000";

// Auto-fit map to route bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 1) {
      map.fitBounds(bounds, { padding: [18, 18] });
    }
  }, [bounds, map]);
  return null;
}

export default function RideMap({ ride }) {
  const [coords, setCoords]   = useState([]);   // [[lat, lon], ...]
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Pull stored coords from the ride. Backend stores them on the document.
  const fromLat = ride?.fromLat;
  const fromLon = ride?.fromLon;
  const toLat   = ride?.toLat;
  const toLon   = ride?.toLon;
  const haveCoords =
    fromLat != null && fromLon != null && toLat != null && toLon != null;

  useEffect(() => {
    if (!haveCoords) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const r = await axios.get(`${API_BASE}/api/route`, {
          params: {
            fromLat,
            fromLng: fromLon,
            toLat,
            toLng:   toLon,
          },
        });

        // /api/route returns geometry as [[lon, lat], ...] (GeoJSON order).
        // Leaflet expects [lat, lon] — flip it.
        const flipped = (r.data?.geometry || []).map((c) => [c[1], c[0]]);
        if (!cancelled) setCoords(flipped);
      } catch (err) {
        if (!cancelled) {
          setError("Could not load route");
          // Still draw a straight line between the two points as a fallback.
          setCoords([
            [fromLat, fromLon],
            [toLat,   toLon],
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromLat, fromLon, toLat, toLon, haveCoords]);

  // Fallback when coords aren't stored on the ride
  if (!haveCoords) {
    return (
      <div className="ridemap ridemap--empty">
        <div className="ridemap__empty-text">Route preview unavailable</div>
      </div>
    );
  }

  // Initial center is the midpoint between start/end
  const center = [
    (fromLat + toLat) / 2,
    (fromLon + toLon) / 2,
  ];

  return (
    <div className="ridemap">
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {coords.length > 1 && (
          <>
            <Polyline
              positions={coords}
              pathOptions={{ color: "#FFD93D", weight: 4, opacity: 0.95 }}
            />
            <FitBounds bounds={coords} />
          </>
        )}

        {/* From marker */}
        <CircleMarker
          center={[fromLat, fromLon]}
          radius={6}
          pathOptions={{
            color: "#fff",
            fillColor: "#22c55e",
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]}>
            <span style={{ fontSize: 10, fontWeight: 700 }}>From</span>
          </Tooltip>
        </CircleMarker>

        {/* To marker */}
        <CircleMarker
          center={[toLat, toLon]}
          radius={6}
          pathOptions={{
            color: "#fff",
            fillColor: "#ef4444",
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Tooltip permanent direction="top" offset={[0, -8]}>
            <span style={{ fontSize: 10, fontWeight: 700 }}>To</span>
          </Tooltip>
        </CircleMarker>
      </MapContainer>

      {loading && (
        <div className="ridemap__overlay">Loading route…</div>
      )}
      {error && !loading && (
        <div className="ridemap__overlay ridemap__overlay--warn">
          Direct line shown
        </div>
      )}
    </div>
  );
}
