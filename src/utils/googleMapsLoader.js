// utils/googleMapsLoader.js
// Single source of truth for loading the Google Maps JS API.
// Using a shared loader options object prevents the "loader must be created with the same options" warning
// when multiple components call useJsApiLoader in the same app.

import { useJsApiLoader } from "@react-google-maps/api";

// Keep this array stable across renders — the loader checks it by reference.
const GOOGLE_MAPS_LIBRARIES = ["places", "geometry"];

export function useGoogleMaps() {
  return useJsApiLoader({
    id: "travelmate-google-maps-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
}
