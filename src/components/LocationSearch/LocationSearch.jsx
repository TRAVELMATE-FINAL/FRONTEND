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

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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

// True once the SDK's NEW Places autocomplete is available.
function newPlacesReady() {
  const p = window.google && window.google.maps && window.google.maps.places;
  return !!(p && p.AutocompleteSuggestion &&
    typeof p.AutocompleteSuggestion.fetchAutocompleteSuggestions === "function");
}
// True once the CLASSIC Places autocomplete service is available. This is far
// more widely supported across mobile browsers / WebViews than the new API, so
// it's our fallback — without it, some phones only ever saw the tiny hardcoded
// district list.
function classicPlacesReady() {
  const p = window.google && window.google.maps && window.google.maps.places;
  return !!(p && p.AutocompleteService);
}
// Either autocomplete path is usable.
function placesReady() {
  return newPlacesReady() || classicPlacesReady();
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
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  // Fixed-position coordinates for the portalled dropdown so it's never clipped
  // by an ancestor's overflow/rounded corners or stacking context (the reason
  // it wasn't fully visible on some phones).
  const [coords, setCoords] = useState(null);

  const { isLoaded } = useGoogleMaps();
  const sessionTokenRef = useRef(null);
  // Flips true once EITHER Places API is usable. Polled, because on slow phones
  // the SDK reports isLoaded before the places library has finished attaching —
  // and without a retry the field would stay stuck on the district fallback.
  const [placesUsable, setPlacesUsable] = useState(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (placesReady()) { setPlacesUsable(true); return; }
    const id = setInterval(() => {
      if (placesReady()) { setPlacesUsable(true); clearInterval(id); }
    }, 300);
    const stop = setTimeout(() => clearInterval(id), 10000);
    return () => { clearInterval(id); clearTimeout(stop); };
  }, [isLoaded]);

  // Fetch India-wide suggestions as the user types. Prefers the new Places API,
  // falls back to the classic AutocompleteService (supported on far more phones)
  // so every device gets the full place list, not the tiny hardcoded fallback.
  useEffect(() => {
    const q = (value || "").trim();
    if (!q) {
      setPredictions([]);
      return;
    }
    if (!isLoaded || !placesReady()) return;

    let cancelled = false;

    const fetchNew = async () => {
      const places = window.google.maps.places;
      if (!sessionTokenRef.current && places.AutocompleteSessionToken) {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      }
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        includedRegionCodes: ["in"],
        sessionToken: sessionTokenRef.current || undefined,
      });
      if (cancelled) return true;
      const out = [];
      (suggestions || []).forEach((s) => {
        const pp = s.placePrediction;
        if (!pp) return;
        const main = (pp.mainText && pp.mainText.text) || (pp.text && pp.text.text) || "";
        const sec = (pp.secondaryText && pp.secondaryText.text) || "";
        out.push({ placePrediction: pp, place_id: pp.placeId, mainText: main, secondaryText: sec });
      });
      setPredictions(out);
      return true;
    };

    const fetchClassic = () =>
      new Promise((resolve) => {
        try {
          const svc = new window.google.maps.places.AutocompleteService();
          svc.getPlacePredictions(
            { input: q, componentRestrictions: { country: "in" } },
            (preds, status) => {
              if (cancelled) return resolve(true);
              const OK = window.google.maps.places.PlacesServiceStatus?.OK || "OK";
              if (status !== OK || !preds) { setPredictions([]); return resolve(true); }
              const out = preds.map((p) => ({
                classicPlaceId: p.place_id,
                place_id: p.place_id,
                mainText: (p.structured_formatting && p.structured_formatting.main_text) || p.description,
                secondaryText: (p.structured_formatting && p.structured_formatting.secondary_text) || "",
              }));
              setPredictions(out);
              resolve(true);
            }
          );
        } catch (e) { resolve(false); }
      });

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        if (newPlacesReady()) {
          try { await fetchNew(); return; }
          catch (e) { /* fall back to classic below */ }
        }
        if (classicPlacesReady()) { await fetchClassic(); return; }
        if (!cancelled) setPredictions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, isLoaded, placesUsable]);

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
        placePrediction: p.placePrediction,   // present for the NEW API only
        classicPlaceId: p.classicPlaceId,     // present for the CLASSIC API only
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

  // Measure the input and decide where the dropdown sits (below by default,
  // above when there isn't room — e.g. the input is near the bottom with the
  // mobile keyboard open). Uses fixed coordinates in the viewport frame.
  const recalcCoords = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;
    const GAP = 6;
    const below = spaceBelow >= 240 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(
      160,
      Math.min(320, (below ? spaceBelow : spaceAbove) - GAP - 8)
    );
    setCoords({
      left: Math.round(r.left),
      width: Math.round(r.width),
      below,
      top: below ? Math.round(r.bottom + GAP) : undefined,
      bottom: below ? undefined : Math.round(vh - r.top + GAP),
      maxHeight: Math.round(maxHeight),
    });
  }, []);

  // Recompute position whenever the dropdown is open, and keep it pinned to the
  // input as the page scrolls or the viewport resizes (keyboard show/hide).
  useEffect(() => {
    if (!open) return;
    recalcCoords();
    const onMove = () => recalcCoords();
    window.addEventListener("scroll", onMove, true); // capture: catch scrolls in any ancestor
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, recalcCoords]);

  // Keep it positioned as the option list length changes too.
  useEffect(() => { if (open) recalcCoords(); }, [options.length, open, recalcCoords]);

  useEffect(() => {
    const onDocClick = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inDrop = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!inWrap && !inDrop) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
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
    // CLASSIC prediction → resolve coordinates via the Geocoder (widely
    // supported), since there's no placePrediction.toPlace() here.
    if (!opt.placePrediction && opt.classicPlaceId) {
      const label = opt.sub && opt.sub !== "India" ? `${opt.name}, ${opt.sub}` : opt.name;
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ placeId: opt.classicPlaceId }, (res, status) => {
          const OK = window.google.maps.GeocoderStatus?.OK || "OK";
          if (status === OK && res && res[0]) {
            const loc = res[0].geometry.location;
            const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
            const lon = typeof loc.lng === "function" ? loc.lng() : loc.lng;
            onSelect({ display_name: res[0].formatted_address || label, lat, lon });
          } else {
            onChange(label);
          }
          setOpen(false);
        });
      } catch (e) {
        onChange(label);
        setOpen(false);
      }
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
        ref={inputRef}
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

      {open && options.length > 0 && coords && createPortal(
        <ul
          ref={dropdownRef}
          className="locsearch__dropdown locsearch__dropdown--portal"
          role="listbox"
          style={{
            position: "fixed",
            left: coords.left,
            width: coords.width,
            top: coords.below ? coords.top : undefined,
            bottom: coords.below ? undefined : coords.bottom,
            maxHeight: coords.maxHeight,
          }}
        >
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
        </ul>,
        document.body
      )}

      {open && value && options.length === 0 && coords && createPortal(
        <div
          ref={dropdownRef}
          className="locsearch__empty locsearch__empty--portal"
          style={{
            position: "fixed",
            left: coords.left,
            width: coords.width,
            top: coords.below ? coords.top : undefined,
            bottom: coords.below ? undefined : coords.bottom,
          }}
        >
          {loading ? "Searching…" : "No matching place"}
        </div>,
        document.body
      )}
    </div>
  );
}
