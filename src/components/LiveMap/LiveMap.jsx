// components/LiveMap/LiveMap.jsx
// Live vehicle map using the app's existing Google Maps. Shows the vehicle's
// current GPS position, centered and zoomed to street level, and moves the
// marker in place as new coordinates arrive (no page refresh). Mobile-friendly.

import { useEffect, useRef, useCallback } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps, useMapsAuthFailed } from "../../utils/googleMapsLoader";

const mapOptions = {
  disableDefaultUI: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: false,
  gestureHandling: "greedy",
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  ],
};

export default function LiveMap({ lat, lon, destLat, destLon, height = 320 }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const authFailed = useMapsAuthFailed();
  const mapRef = useRef(null);
  const vehicleRef = useRef(null);
  const destRef = useRef(null);

  const hasVehicle = Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));
  // Only treat a destination as real if it's non-zero (0,0 = unset → ignore).
  const hasDest =
    Number.isFinite(Number(destLat)) && Number.isFinite(Number(destLon)) &&
    !(Number(destLat) === 0 && Number(destLon) === 0);

  const draw = useCallback(() => {
    const g = window.google;
    const map = mapRef.current;
    if (!g || !map || !hasVehicle) return;
    const pos = { lat: Number(lat), lng: Number(lon) };

    if (!vehicleRef.current) {
      vehicleRef.current = new g.maps.Marker({
        position: pos,
        map,
        title: "Vehicle (live)",
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#7c3aed",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        zIndex: 5,
      });
      map.setCenter(pos);
      map.setZoom(15); // street level on first fix
    } else {
      vehicleRef.current.setPosition(pos);
      map.panTo(pos); // keep the vehicle in view as it moves
    }

    if (hasDest) {
      const d = { lat: Number(destLat), lng: Number(destLon) };
      if (!destRef.current) {
        destRef.current = new g.maps.Marker({
          position: d, map, title: "Destination",
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#ef4444", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
          zIndex: 4,
        });
      } else {
        destRef.current.setPosition(d);
      }
    }
  }, [lat, lon, destLat, destLon, hasVehicle, hasDest]);

  const onLoad = useCallback((map) => { mapRef.current = map; draw(); }, [draw]);
  const onUnmount = useCallback(() => {
    if (vehicleRef.current) { vehicleRef.current.setMap(null); vehicleRef.current = null; }
    if (destRef.current) { destRef.current.setMap(null); destRef.current = null; }
    mapRef.current = null;
  }, []);

  // Move the marker whenever coordinates change.
  useEffect(() => { draw(); }, [draw]);

  const boxStyle = { width: "100%", height, borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb", background: "#eef2f7", position: "relative" };
  const msg = (t) => (
    <div style={boxStyle}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 14, textAlign: "center", padding: 16 }}>{t}</div>
    </div>
  );

  if (loadError || authFailed) return msg("Map unavailable right now.");
  if (!isLoaded) return msg("Loading map…");
  if (!hasVehicle) return msg("Waiting for the vehicle's location…");

  return (
    <div style={boxStyle}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={{ lat: Number(lat), lng: Number(lon) }}
        zoom={15}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
      />
    </div>
  );
}
