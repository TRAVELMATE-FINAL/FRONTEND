// components/BusRouteMap/BusRouteMap.jsx
// Shared map that plots a bus/ride route in travel order (From → stops → To)
// using Google Directions (falls back to geocoded markers + a straight line).
// Used by both the Bus Routes page and the Post Ride bus-number picker so there
// is a SINGLE route map implementation (no duplicate maps).

import { useState, useRef, useCallback } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps, useMapsAuthFailed } from "../../utils/googleMapsLoader";

// ── Geocode cache (module-level + localStorage) so repeated lookups never
// re-hit the Geocoder for the same place name. ──
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

const mapMsgStyle = {
  padding: "16px", textAlign: "center", color: "#6b7280", fontSize: 14,
  background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14,
};

export default function BusRouteMap({ route, height = 320 }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const authFailed = useMapsAuthFailed();
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const [status, setStatus] = useState("idle"); // idle | plotting | ok | nocoords

  const clear = useCallback(() => {
    layersRef.current.forEach((l) => { try { l.setMap(null); } catch {} });
    layersRef.current = [];
  }, []);

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
        { address: `${name}, Chennai, Tamil Nadu, India`, componentRestrictions: { country: "IN" } },
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

    const REGION = ", Chennai, Tamil Nadu, India";
    const origin = String(route.from || "").trim() + REGION;
    const destination = String(route.to || "").trim() + REGION;
    const stopNames = (route.stops || []).map((s) => s.name).filter(Boolean);
    const waypoints = stopNames.slice(0, 23).map((name) => ({ location: name + REGION, stopover: true }));

    const ds = new g.maps.DirectionsService();
    const routeReq = (wp) => new Promise((resolve) => {
      ds.route(
        { origin, destination, waypoints: wp, optimizeWaypoints: false, travelMode: g.maps.TravelMode.DRIVING },
        (res, st) => resolve(st === "OK" ? res : null)
      );
    });
    let result = await routeReq(waypoints);
    if (!result && waypoints.length) result = await routeReq([]);

    if (result && result.routes && result.routes[0]) {
      const renderer = new g.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: { strokeColor: "#7c3aed", strokeWeight: 5, strokeOpacity: 0.9 },
      });
      renderer.setDirections(result);
      layersRef.current.push(renderer);
      const legs = result.routes[0].legs || [];
      if (legs.length) {
        mk(map, legs[0].start_location, "#22c55e", { text: "A", color: "#fff", fontSize: "11px", fontWeight: "700" }, 9, route.from);
        for (let i = 0; i < legs.length - 1; i++) mk(map, legs[i].end_location, "#7c3aed", undefined, 6);
        mk(map, legs[legs.length - 1].end_location, "#ef4444", { text: "B", color: "#fff", fontSize: "11px", fontWeight: "700" }, 9, route.to);
      }
      setStatus("ok");
      return;
    }

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
      <div style={{ width: "100%", height, borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={{ lat: 13.0827, lng: 80.2707 }}
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
