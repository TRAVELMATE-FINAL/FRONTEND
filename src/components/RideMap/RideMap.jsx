// components/RideMap/RideMap.jsx
// Mini Google Map for each ride card on the FindFriends page.
// Uses Google Directions Service to draw the actual driving route between
// the ride's from/to coordinates, with auto-fit bounds.
//
// Drop-in replacement for the previous Leaflet/OSM version — same prop shape
// (expects `ride` with fromLat/fromLon/toLat/toLon).

import { useEffect, useState, useRef, useCallback } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "../../utils/googleMapsLoader";
import "./RideMap.css";

const containerStyle = { width: "100%", height: "100%" };

// Minimal map styling — clean look that matches the dark ride card
const mapOptions = {
  disableDefaultUI: true,
  gestureHandling: "none",
  clickableIcons: false,
  keyboardShortcuts: false,
  styles: [
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
};

export default function RideMap({ ride }) {
  const { isLoaded, loadError } = useGoogleMaps();

  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const fallbackPolylineRef = useRef(null);
  const markersRef = useRef([]);

  const [hasRoute, setHasRoute] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routeInfo, setRouteInfo] = useState({ distance: "", duration: "" });

  const fromLat = ride?.fromLat;
  const fromLon = ride?.fromLon;
  const toLat = ride?.toLat;
  const toLon = ride?.toLon;
  const haveCoords =
    fromLat != null && fromLon != null && toLat != null && toLon != null;

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Clean up any drawings on this map (route, fallback line, markers)
  const clearMapLayers = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (fallbackPolylineRef.current) {
      fallbackPolylineRef.current.setMap(null);
      fallbackPolylineRef.current = null;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }, []);

  // Draw A/B markers on the map (also used as a fallback when Directions fails)
  const drawMarkers = useCallback(
    (map) => {
      const g = window.google;
      const from = new g.maps.Marker({
        position: { lat: Number(fromLat), lng: Number(fromLon) },
        map,
        label: { text: "A", color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      const to = new g.maps.Marker({
        position: { lat: Number(toLat), lng: Number(toLon) },
        map,
        label: { text: "B", color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      markersRef.current = [from, to];
    },
    [fromLat, fromLon, toLat, toLon]
  );

  // Fetch + render the directions whenever the coords change
  useEffect(() => {
    if (!isLoaded || !haveCoords || !mapRef.current) return;
    const g = window.google;
    const map = mapRef.current;

    clearMapLayers();

    const directionsService = new g.maps.DirectionsService();
    const renderer = new g.maps.DirectionsRenderer({
      map,
      suppressMarkers: true, // we draw our own A/B markers for consistent styling
      polylineOptions: {
        strokeColor: "#FFD93D",
        strokeWeight: 4,
        strokeOpacity: 0.95,
      },
      preserveViewport: false, // auto-fit to the route
    });

    directionsService.route(
      {
        origin: { lat: Number(fromLat), lng: Number(fromLon) },
        destination: { lat: Number(toLat), lng: Number(toLon) },
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          renderer.setDirections(result);
          directionsRendererRef.current = renderer;
          drawMarkers(map);
          // Pull distance + duration straight from the Directions response (no extra API call)
          const leg = result.routes?.[0]?.legs?.[0];
          setRouteInfo({
            distance: leg?.distance?.text || "",
            duration: leg?.duration?.text || "",
          });
          setHasRoute(true);
          setRouteError("");
        } else {
          // Directions API failed — fall back to a straight line between A and B
          const path = [
            { lat: Number(fromLat), lng: Number(fromLon) },
            { lat: Number(toLat), lng: Number(toLon) },
          ];
          const line = new g.maps.Polyline({
            path,
            map,
            strokeColor: "#FFD93D",
            strokeOpacity: 0.95,
            strokeWeight: 4,
          });
          fallbackPolylineRef.current = line;
          const bounds = new g.maps.LatLngBounds();
          path.forEach((p) => bounds.extend(p));
          map.fitBounds(bounds, 24);
          drawMarkers(map);
          // As a fallback, use Distance Matrix to at least show "~km / ~min" even when route fails
          if (g.maps.DistanceMatrixService) {
            const dm = new g.maps.DistanceMatrixService();
            dm.getDistanceMatrix(
              {
                origins: [{ lat: Number(fromLat), lng: Number(fromLon) }],
                destinations: [{ lat: Number(toLat), lng: Number(toLon) }],
                travelMode: g.maps.TravelMode.DRIVING,
                unitSystem: g.maps.UnitSystem.METRIC,
              },
              (resp, st) => {
                const el = resp?.rows?.[0]?.elements?.[0];
                if (st === "OK" && el?.status === "OK") {
                  setRouteInfo({
                    distance: el.distance?.text || "",
                    duration: el.duration?.text || "",
                  });
                } else {
                  setRouteInfo({ distance: "", duration: "" });
                }
              }
            );
          }
          setHasRoute(false);
          setRouteError("Direct line shown");
        }
      }
    );

    return () => {
      clearMapLayers();
    };
  }, [isLoaded, haveCoords, fromLat, fromLon, toLat, toLon, drawMarkers, clearMapLayers]);

  // ─── Render states ───────────────────────────────────────────────
  if (!haveCoords) {
    return (
      <div className="ridemap ridemap--empty">
        <div className="ridemap__empty-text">Route preview unavailable</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="ridemap ridemap--empty">
        <div className="ridemap__empty-text">Map failed to load</div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="ridemap ridemap--empty">
        <div className="ridemap__empty-text">Loading map…</div>
      </div>
    );
  }

  // Midpoint between A and B — Directions will recenter once the route arrives
  const center = {
    lat: (Number(fromLat) + Number(toLat)) / 2,
    lng: (Number(fromLon) + Number(toLon)) / 2,
  };

  return (
    <div className="ridemap">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={7}
        options={mapOptions}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      />
      {routeError && !hasRoute && (
        <div className="ridemap__overlay ridemap__overlay--warn">
          {routeError}
        </div>
      )}
      {(routeInfo.distance || routeInfo.duration) && (
        <div className="ridemap__info">
          {routeInfo.distance && (
            <span className="ridemap__info-item">
              <span className="ridemap__info-icon">📍</span>
              {routeInfo.distance}
            </span>
          )}
          {routeInfo.duration && (
            <span className="ridemap__info-item">
              <span className="ridemap__info-icon">⏱</span>
              {routeInfo.duration}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
