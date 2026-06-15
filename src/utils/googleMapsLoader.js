// utils/googleMapsLoader.js
// Single source of truth for loading the Google Maps JS API.
// Using a shared loader options object prevents the "loader must be created with the same options" warning
// when multiple components call useJsApiLoader in the same app.

import { useEffect, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// Keep this array stable across renders — the loader checks it by reference.
const GOOGLE_MAPS_LIBRARIES = ["places", "geometry"];

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// ─── Auth-failure detection ────────────────────────────────────────────────
// Google does NOT report an HTTP/script error when a key is rejected at
// runtime (bad key, billing off, an un-enabled API, or — most commonly — the
// page's domain isn't in the key's "Website restrictions" list). Instead the
// JS SDK loads fine, then calls the global `window.gm_authFailure` and renders
// a BLANK / WHITE map. We capture that here so the UI can show a real reason
// instead of a silent white box.
let mapsAuthFailed = false;
const authListeners = new Set();

if (typeof window !== "undefined") {
  // Warn early if the key is missing at build time.
  if (!API_KEY) {
    // eslint-disable-next-line no-console
    console.error(
      "[googleMapsLoader] VITE_GOOGLE_MAPS_API_KEY is empty — the map will not load. " +
        "Add it to your .env and rebuild."
    );
  }
  // Google calls this global automatically on auth failure.
  window.gm_authFailure = () => {
    mapsAuthFailed = true;
    // eslint-disable-next-line no-console
    console.error(
      "[googleMapsLoader] Google Maps authentication failed (gm_authFailure). " +
        "Most likely the current domain is not in the API key's allowed referrers, " +
        "billing is disabled, or a required API (Maps JavaScript / Directions / " +
        "Places / Distance Matrix) is not enabled in Google Cloud Console."
    );
    authListeners.forEach((fn) => fn(true));
  };
}

/**
 * Hook: returns true once Google Maps has reported an authentication failure.
 * Map components use this to render an explanatory message instead of a
 * blank/white map.
 */
export function useMapsAuthFailed() {
  const [failed, setFailed] = useState(mapsAuthFailed);
  useEffect(() => {
    if (mapsAuthFailed) setFailed(true);
    const fn = (v) => setFailed(v);
    authListeners.add(fn);
    return () => authListeners.delete(fn);
  }, []);
  return failed;
}

export function useGoogleMaps() {
  return useJsApiLoader({
    id: "travelmate-google-maps-script",
    googleMapsApiKey: API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    // Google's recommended async bootstrap — silences the
    // "loading=async" performance warning and avoids load races.
    loading: "async",
  });
}
