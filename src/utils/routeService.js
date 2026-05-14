// utils/routeService.js
// Thin helpers around Google's Directions + Distance Matrix services.
// Both APIs are loaded via the Maps JS SDK once useGoogleMaps() resolves.

/**
 * Get a driving route between two points.
 * Returns { directions, distanceText, distanceMeters, durationText, durationSeconds }
 * or rejects if the route can't be computed.
 *
 * @param {{lat:number,lng:number}} origin
 * @param {{lat:number,lng:number}} destination
 */
export function getRouteInfo(origin, destination) {
  return new Promise((resolve, reject) => {
    const g = window.google;
    if (!g?.maps?.DirectionsService) {
      reject(new Error("Google Maps not loaded"));
      return;
    }
    const service = new g.maps.DirectionsService();
    service.route(
      {
        origin,
        destination,
        travelMode: g.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result?.routes?.[0]?.legs?.[0]) {
          const leg = result.routes[0].legs[0];
          resolve({
            directions: result,
            distanceText: leg.distance?.text || "",
            distanceMeters: leg.distance?.value || 0,
            durationText: leg.duration?.text || "",
            durationSeconds: leg.duration?.value || 0,
          });
        } else {
          reject(new Error("Directions failed: " + status));
        }
      }
    );
  });
}

/**
 * Compute a distance matrix between multiple origins and destinations in one batched call.
 * Use this on the FindFriends list page if you want to show "X km away" for many
 * rides at once without calling Directions per card.
 *
 * @param {Array<{lat:number,lng:number}>} origins
 * @param {Array<{lat:number,lng:number}>} destinations
 * @returns {Promise<Array<Array<{distanceText, distanceMeters, durationText, durationSeconds, status}>>>}
 *          Outer array indexed by origin, inner array indexed by destination.
 */
export function getDistanceMatrix(origins, destinations) {
  return new Promise((resolve, reject) => {
    const g = window.google;
    if (!g?.maps?.DistanceMatrixService) {
      reject(new Error("Google Maps not loaded"));
      return;
    }
    if (!origins?.length || !destinations?.length) {
      resolve([]);
      return;
    }
    const service = new g.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins,
        destinations,
        travelMode: g.maps.TravelMode.DRIVING,
        unitSystem: g.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== "OK") {
          reject(new Error("DistanceMatrix failed: " + status));
          return;
        }
        const matrix = response.rows.map((row) =>
          row.elements.map((el) => ({
            status: el.status,
            distanceText: el.distance?.text || "",
            distanceMeters: el.distance?.value || 0,
            durationText: el.duration?.text || "",
            durationSeconds: el.duration?.value || 0,
          }))
        );
        resolve(matrix);
      }
    );
  });
}

/**
 * Optional: call Google's newer Routes API (REST) directly.
 * Returns { distanceMeters, durationSeconds, polylineEncoded }.
 * Use this if you ever want the "Routes API" pricing/features instead of the legacy Directions API.
 */
export async function getRouteFromRoutesApi(origin, destination, apiKey) {
  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
    }
  );
  if (!res.ok) throw new Error("Routes API failed: " + res.status);
  const data = await res.json();
  const r = data?.routes?.[0];
  if (!r) throw new Error("Routes API returned no routes");
  return {
    distanceMeters: r.distanceMeters,
    durationSeconds: parseInt(r.duration, 10) || 0, // "1234s" → 1234
    polylineEncoded: r.polyline?.encodedPolyline || "",
  };
}
