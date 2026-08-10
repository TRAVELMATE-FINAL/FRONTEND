// components/LocationSearch/LocationSearch.jsx
// India-wide location autocomplete using the Places API (New) REST endpoint
// directly (https://places.googleapis.com/v1/places:autocomplete).
//
// Why REST instead of the JS SDK's AutocompleteSuggestion class: the SDK class
// can fail to initialise reliably on some mobile browsers (loading race), which
// made the dropdown fall back to a fixed district list and show "No matching
// place". Calling the REST endpoint (the same one verified with curl) behaves
// identically on desktop and mobile — no SDK timing dependency.
//
// Returns any place in India: states, districts, cities, towns, villages,
// localities, suburbs, bus/railway/metro stations, airports, landmarks,
// tourist spots, colleges, IT parks, industrial/residential areas, any POI.

import { useState, useRef, useEffect, useMemo } from "react";
import "./LocationSearch.css";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Tamil Nadu district fallback — only used if the API key is missing.
const TN_DISTRICTS = [
  { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  { name: "Coimbatore", lat: 11.0168, lon: 76.9558 },
  { name: "Madurai", lat: 9.9252, lon: 78.1198 },
  { name: "Tiruchirappalli", lat: 10.7905, lon: 78.7047 },
  { name: "Salem", lat: 11.6643, lon: 78.146 },
  { name: "Tirunelveli", lat: 8.7139, lon: 77.7567 },
  { name: "Vellore", lat: 12.9165, lon: 79.1325 },
  { name: "Erode", lat: 11.341, lon: 77.7172 },
  { name: "Thoothukudi", lat: 8.7642, lon: 78.1348 },
  { name: "Thanjavur", lat: 10.787, lon: 79.1378 },
];

function newSessionToken() {
  try {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  } catch {}
  return "tok-" + Math.random().toString(36).slice(2) + Date.now();
}

export default function LocationSearch({
  placeholder = "Search location",
  value = "",
  onChange = () => {},
  onSelect = () => {},
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const sessionTokenRef = useRef(newSessionToken());

  // Fetch India-wide suggestions from Places API (New) as the user types.
  useEffect(() => {
    const q = (value || "").trim();
    if (!q || !API_KEY) {
      setPredictions([]);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": API_KEY,
          },
          body: JSON.stringify({
            input: q,
            includedRegionCodes: ["in"], // India only
            sessionToken: sessionTokenRef.current,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        const out = [];
        (data.suggestions || []).forEach((s) => {
          const pp = s.placePrediction;
          if (!pp) return;
          const sf = pp.structuredFormat || {};
          out.push({
            place_id: pp.placeId,
            mainText: (sf.mainText && sf.mainText.text) || (pp.text && pp.text.text) || "",
            secondaryText: (sf.secondaryText && sf.secondaryText.text) || "",
          });
        });
        setPredictions(out);
      } catch (e) {
        if (!cancelled) setPredictions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value]);

  const options = useMemo(() => {
    const q = (value || "").trim().toLowerCase();

    if (!q) {
      return TN_DISTRICTS.map((d) => ({
        kind: "local", name: d.name, sub: "Tamil Nadu", lat: d.lat, lon: d.lon,
      }));
    }
    if (API_KEY && predictions.length > 0) {
      return predictions.map((p) => ({
        kind: "google",
        name: p.mainText,
        sub: p.secondaryText || "India",
        place_id: p.place_id,
      }));
    }
    // No API key configured → offer the district fallback.
    if (!API_KEY) {
      return TN_DISTRICTS.filter((d) => d.name.toLowerCase().includes(q)).map((d) => ({
        kind: "local", name: d.name, sub: "Tamil Nadu", lat: d.lat, lon: d.lon,
      }));
    }
    return []; // API key present but no matches / still loading
  }, [value, predictions]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => { setHighlight(0); }, [options.length]);

  const pick = async (opt) => {
    if (opt.kind === "local") {
      onSelect({ display_name: opt.name, lat: opt.lat, lon: opt.lon });
      setOpen(false);
      return;
    }
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${opt.place_id}?sessionToken=${sessionTokenRef.current}`,
        {
          headers: {
            "X-Goog-Api-Key": API_KEY,
            "X-Goog-FieldMask": "location,formattedAddress,displayName",
          },
        }
      );
      const place = await res.json();
      const loc = place.location;
      if (!loc || loc.latitude == null) {
        onChange(opt.name);
        setOpen(false);
        return;
      }
      const display =
        place.formattedAddress || (place.displayName && place.displayName.text) || opt.name;
      onSelect({ display_name: display, lat: loc.latitude, lon: loc.longitude });
      setOpen(false);
      sessionTokenRef.current = newSessionToken(); // new session after a selection
    } catch (e) {
      onChange(opt.name);
      setOpen(false);
    }
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
                className={"locsearch__option" + (isActive ? " locsearch__option--active" : "")}
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
        <div className="locsearch__empty">{loading ? "Searching…" : "No matching place"}</div>
      )}
    </div>
  );
}
