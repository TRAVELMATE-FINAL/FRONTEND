// components/LocationSearch/LocationSearch.jsx
// Tamil Nadu (and wider India) locations autocomplete.
//
// Primary source: Google Places Autocomplete - so the dropdown surfaces
// EVERY city, town, village, neighbourhood, landmark, temple, beach and
// business POI within Tamil Nadu (not just the 38 district headquarters).
// We run two parallel queries - one for geocodes (cities/towns/addresses)
// and one for establishments (landmarks/temples/hotels) - then merge them
// so anything you would see pinned on the state map can be picked.
//
// Fallback: if the Google Maps script hasn't loaded yet (or the API key
// is missing) we drop back to the 38 hard-coded district centroids so the
// component still works in degraded mode.

import { useState, useRef, useEffect, useMemo } from "react";
import { useGoogleMaps } from "../../utils/googleMapsLoader";
import "./LocationSearch.css";

const TN_DISTRICTS = [
  { name: "Ariyalur",        lat: 11.1401, lon: 79.0786 },
  { name: "Chengalpattu",    lat: 12.6918, lon: 79.9747 },
  { name: "Chennai",         lat: 13.0827, lon: 80.2707 },
  { name: "Coimbatore",      lat: 11.0168, lon: 76.9558 },
  { name: "Cuddalore",       lat: 11.7480, lon: 79.7714 },
  { name: "Dharmapuri",      lat: 12.1357, lon: 78.1581 },
  { name: "Dindigul",        lat: 10.3673, lon: 77.9803 },
  { name: "Erode",           lat: 11.3410, lon: 77.7172 },
  { name: "Kallakurichi",    lat: 11.7401, lon: 78.9590 },
  { name: "Kancheepuram",    lat: 12.8342, lon: 79.7036 },
  { name: "Kanyakumari",     lat:  8.0883, lon: 77.5385 },
  { name: "Karur",           lat: 10.9601, lon: 78.0766 },
  { name: "Krishnagiri",     lat: 12.5266, lon: 78.2150 },
  { name: "Madurai",         lat:  9.9252, lon: 78.1198 },
  { name: "Mayiladuthurai",  lat: 11.1018, lon: 79.6555 },
  { name: "Nagapattinam",    lat: 10.7672, lon: 79.8449 },
  { name: "Namakkal",        lat: 11.2189, lon: 78.1677 },
  { name: "Nilgiris",        lat: 11.4916, lon: 76.7337 },
  { name: "Perambalur",      lat: 11.2342, lon: 78.8807 },
  { name: "Pudukottai",      lat: 10.3833, lon: 78.8001 },
  { name: "Ramanathapuram",  lat:  9.3639, lon: 78.8395 },
  { name: "Ranipet",         lat: 12.9249, lon: 79.3308 },
  { name: "Salem",           lat: 11.6643, lon: 78.1460 },
  { name: "Sivaganga",       lat:  9.8430, lon: 78.4809 },
  { name: "Tenkasi",         lat:  8.9595, lon: 77.3152 },
  { name: "Thanjavur",       lat: 10.7870, lon: 79.1378 },
  { name: "Theni",           lat: 10.0104, lon: 77.4768 },
  { name: "Thoothukudi",     lat:  8.7642, lon: 78.1348 },
  { name: "Tiruchirappalli", lat: 10.7905, lon: 78.7047 },
  { name: "Tirunelveli",     lat:  8.7139, lon: 77.7567 },
  { name: "Tirupathur",      lat: 12.4956, lon: 78.5734 },
  { name: "Tiruppur",        lat: 11.1085, lon: 77.3411 },
  { name: "Tiruvallur",      lat: 13.1439, lon: 79.9094 },
  { name: "Tiruvannamalai",  lat: 12.2253, lon: 79.0747 },
  { name: "Tiruvarur",       lat: 10.7726, lon: 79.6368 },
  { name: "Vellore",         lat: 12.9165, lon: 79.1325 },
  { name: "Viluppuram",      lat: 11.9398, lon: 79.4918 },
  { name: "Virudhunagar",    lat:  9.5680, lon: 77.9624 },
];

const TN_BOUNDS_SW = { lat: 8.0, lng: 76.2 };
const TN_BOUNDS_NE = { lat: 13.6, lng: 80.4 };

export default function LocationSearch({
  placeholder = "Search location",
  value = "",
  onChange = () => {},
  onSelect = () => {},
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [predictions, setPredictions] = useState([]);
  const wrapRef = useRef(null);

  const { isLoaded } = useGoogleMaps();
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const sessionTokenRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!window.google || !window.google.maps || !window.google.maps.places) return;
    const g = window.google;
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new g.maps.places.AutocompleteService();
    }
    if (!placesServiceRef.current) {
      const stub = document.createElement("div");
      placesServiceRef.current = new g.maps.places.PlacesService(stub);
    }
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  useEffect(() => {
    const q = (value || "").trim();
    if (!q) {
      setPredictions([]);
      return;
    }
    if (!isLoaded || !autocompleteServiceRef.current) return;
    if (!window.google || !window.google.maps || !window.google.maps.places) return;

    const g = window.google;
    const bounds = new g.maps.LatLngBounds(
      new g.maps.LatLng(TN_BOUNDS_SW.lat, TN_BOUNDS_SW.lng),
      new g.maps.LatLng(TN_BOUNDS_NE.lat, TN_BOUNDS_NE.lng)
    );

    let cancelled = false;
    const queries = [{ types: ["geocode"] }, { types: ["establishment"] }];
    const merged = [];
    let pending = queries.length;
    const seen = new Set();

    const finalize = () => {
      if (cancelled) return;
      const out = [];
      merged.forEach((p) => {
        if (seen.has(p.place_id)) return;
        seen.add(p.place_id);
        out.push(p);
      });
      setPredictions(out);
    };

    queries.forEach((q2) => {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: q,
          types: q2.types,
          componentRestrictions: { country: "in" },
          locationBias: bounds,
          sessionToken: sessionTokenRef.current,
        },
        (results, status) => {
          if (cancelled) return;
          if (status === g.maps.places.PlacesServiceStatus.OK && results) {
            results.forEach((p) => {
              const sf = p.structured_formatting || {};
              merged.push({
                description: p.description,
                place_id: p.place_id,
                mainText: sf.main_text || p.description,
                secondaryText: sf.secondary_text || "",
              });
            });
          }
          pending -= 1;
          if (pending === 0) finalize();
        }
      );
    });

    return () => { cancelled = true; };
  }, [value, isLoaded]);

  const options = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    const googleReady = isLoaded && !!autocompleteServiceRef.current;

    if (!q) {
      return TN_DISTRICTS.map((d) => ({
        kind: "local",
        name: d.name,
        sub: "Tamil Nadu",
        lat: d.lat,
        lon: d.lon,
      }));
    }

    if (googleReady && predictions.length > 0) {
      return predictions.map((p) => ({
        kind: "google",
        name: p.mainText,
        sub: p.secondaryText || "India",
        place_id: p.place_id,
      }));
    }

    return TN_DISTRICTS.filter((d) =>
      q.length === 1
        ? d.name.toLowerCase().startsWith(q)
        : d.name.toLowerCase().includes(q)
    ).map((d) => ({
      kind: "local",
      name: d.name,
      sub: "Tamil Nadu",
      lat: d.lat,
      lon: d.lon,
    }));
  }, [value, isLoaded, predictions]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [options.length]);

  const pick = (opt) => {
    if (opt.kind === "local") {
      onSelect({ display_name: opt.name, lat: opt.lat, lon: opt.lon });
      setOpen(false);
      return;
    }
    const svc = placesServiceRef.current;
    if (!svc) {
      onChange(opt.name);
      setOpen(false);
      return;
    }
    const g = window.google;
    svc.getDetails(
      {
        placeId: opt.place_id,
        fields: ["geometry", "name", "formatted_address"],
        sessionToken: sessionTokenRef.current,
      },
      (place, status) => {
        const loc = place && place.geometry && place.geometry.location;
        if (status !== g.maps.places.PlacesServiceStatus.OK || !loc) {
          onChange(opt.name);
          setOpen(false);
          return;
        }
        const lat = loc.lat();
        const lon = loc.lng();
        const display = place.formatted_address || place.name || opt.name;
        onSelect({ display_name: display, lat, lon });
        setOpen(false);
        sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
      }
    );
  };

  const handleKey = (e) => {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(options[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="locsearch" ref={wrapRef}>
      <input
        className="locsearch__input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        autoComplete="off"
      />

      {open && options.length > 0 && (
        <ul className="locsearch__dropdown" role="listbox">
          {options.map((opt, i) => {
            const itemKey = (opt.place_id || opt.name) + "_" + i;
            const isActive = i === highlight;
            return (
              <li
                key={itemKey}
                role="option"
                aria-selected={isActive}
                className={
                  "locsearch__option" +
                  (isActive ? " locsearch__option--active" : "")
                }
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(opt);
                }}
              >
                <span className="locsearch__pin" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="#7c3aed" strokeWidth="2.2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <span className="locsearch__name">{opt.name}</span>
                {opt.sub && <span className="locsearch__sub">{opt.sub}</span>}
              </li>
            );
          })}
        </ul>
      )}

      {open && value && options.length === 0 && (
        <div className="locsearch__empty">No matching place</div>
      )}
    </div>
  );
}
