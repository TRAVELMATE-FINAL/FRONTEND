// components/LocationSearch/LocationSearch.jsx
// India-wide location autocomplete using the Google Maps JS SDK's new Places
// API (google.maps.places.AutocompleteSuggestion + Place).
//
// We use the SDK (not a raw REST fetch) because the SDK handles the API key,
// HTTP-referrer and CORS correctly in the browser — a direct REST call to
// places.googleapis.com gets rejected with referrer-restricted keys.
//
// The dropdown returns any place in India: states, districts, cities, towns,
// villages, localities, suburbs, bus/railway/metro stations, airports,
// landmarks, tourist spots, colleges, IT parks, industrial/residential areas.

import { useState, useRef, useEffect, useMemo } from "react";
import { useGoogleMaps } from "../../utils/googleMapsLoader";
import "./LocationSearch.css";

// Fallback list only used if the Maps SDK/key is unavailable.
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

// True once the SDK's new Places autocomplete is actually available.
function placesReady() {
  const p = window.google && window.google.maps && window.google.maps.places;
  return !!(p && p.AutocompleteSuggestion &&
    typeof p.AutocompleteSuggestion.fetchAutocompleteSuggestions === "function");
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

  const { isLoaded } = useGoogleMaps();
  const sessionTokenRef = useRef(null);

  // Fetch India-wide suggestions as the user types. We check placesReady()
  // LIVE (not via a ref set elsewhere) so a slow mobile load can't leave us
  // stuck on the district fallback.
  useEffect(() => {
    const q = (value || "").trim();
    if (!q) {
      setPredictions([]);
      return;
    }
    if (!isLoaded || !placesReady()) return;

    const places = window.google.maps.places;
    if (!sessionTokenRef.current && places.AutocompleteSessionToken) {
      sessionTokenRef.current = new places.AutocompleteSessionToken();
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          includedRegionCodes: ["in"], // India only
          sessionToken: sessionTokenRef.current || undefined,
        });
        if (cancelled) return;
        const out = [];
        (suggestions || []).forEach((s) => {
          const pp = s.placePrediction;
          if (!pp) return;
          const main = (pp.mainText && pp.mainText.text) || (pp.text && pp.text.text) || "";
          const sec = (pp.secondaryText && pp.secondaryText.text) || "";
          out.push({ placePrediction: pp, place_id: pp.placeId, mainText: main, secondaryText: sec });
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
  }, [value, isLoaded]);

  const options = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) {
      return TN_DISTRICTS.map((d) => ({
        kind: "local", name: d.name, sub: "Tamil Nadu", lat: d.lat, lon: d.lon,
      }));
    }
    if (predictions.length > 0) {
      return predictions.map((p) => ({
        kind: "google",
        name: p.mainText,
        sub: p.secondaryText || "India",
        place_id: p.place_id,
        placePrediction: p.placePrediction,
      }));
    }
    // If the SDK isn't available at all, offer a district match so the field
    // still works in degraded mode.
    if (!placesReady()) {
      return TN_DISTRICTS.filter((d) => d.name.toLowerCase().includes(q)).map((d) => ({
        kind: "local", name: d.name, sub: "Tamil Nadu", lat: d.lat, lon: d.lon,
      }));
    }
    return [];
  }, [value, predictions]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // While the dropdown is open, lift the containing field ABOVE its siblings
  // so the suggestions overlay the next field (e.g. "To") instead of being
  // painted behind it. This is far more reliable than :focus-within CSS,
  // which can lose to sibling stacking contexts. Works for the field
  // wrappers used in both the Hero and Findfriend search bars.
  useEffect(() => {
    const el =
      wrapRef.current &&
      wrapRef.current.closest(".field--locsearch, .ff-field, .field");
    if (!el) return;
    if (open) el.classList.add("locsearch-open");
    else el.classList.remove("locsearch-open");
    return () => el.classList.remove("locsearch-open");
  }, [open]);

  useEffect(() => { setHighlight(0); }, [options.length]);

  const pick = async (opt) => {
    if (opt.kind === "local") {
      onSelect({ display_name: opt.name, lat: opt.lat, lon: opt.lon });
      setOpen(false);
      return;
    }
    try {
      const place = opt.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      const loc = place.location;
      if (!loc) {
        onChange(opt.name);
        setOpen(false);
        return;
      }
      const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
      const lon = typeof loc.lng === "function" ? loc.lng() : loc.lng;
      const display = place.formattedAddress || place.displayName || opt.name;
      onSelect({ display_name: display, lat, lon });
      setOpen(false);
      const places = window.google && window.google.maps && window.google.maps.places;
      if (places && places.AutocompleteSessionToken) {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      }
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
