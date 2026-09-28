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
import axios from "axios";
import { useGoogleMaps } from "../../utils/googleMapsLoader";
import "./LocationSearch.css";

const API_BASE =
  import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

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

// ── Fuzzy match scoring (client-side re-ranking) ────────────────────────────
// The data source (Google/Photon) provides recall — including typo tolerance.
// This scores each returned candidate against what the user typed so the
// CLOSEST match is listed first. Case-insensitive. Handles: exact, prefix,
// substring-anywhere, and misspellings (via edit distance).
function levenshtein(a, b) {
  a = a || ""; b = b || "";
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,          // deletion
        prev[j - 1] + 1,      // insertion
        prevDiag + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
      prevDiag = tmp;
    }
  }
  return prev[b.length];
}

// Higher score = closer match. Compares the query to the place name (and, more
// weakly, its full label so "chennai central" still matches "chennai").
function fuzzyScore(query, name, sub) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return 0;
  const n = String(name || "").toLowerCase();
  const full = (n + " " + String(sub || "").toLowerCase()).trim();
  if (!n) return 0;

  if (n === q) return 1000;                       // exact
  if (n.startsWith(q)) return 900 - n.length;     // starts-with (shorter wins)
  // any word in the name starts with the query
  if (n.split(/[\s,]+/).some((w) => w.startsWith(q))) return 820 - n.length;
  if (n.includes(q)) return 780 - n.indexOf(q);   // substring anywhere
  if (full.includes(q)) return 700;               // appears in the full label

  // Misspelling tolerance — compare against the name, and the best-matching
  // single word of the name (so "banglore" ~ "bangalore").
  const words = n.split(/[\s,]+/).filter(Boolean);
  let best = levenshtein(q, n);
  for (const w of words) best = Math.min(best, levenshtein(q, w));
  const ref = Math.max(q.length, 1);
  const sim = 1 - best / Math.max(ref, best || 1); // 0..1
  // Accept as a fuzzy match when reasonably close.
  if (sim >= 0.5 || best <= Math.max(2, Math.ceil(ref * 0.34))) {
    return Math.round(400 * sim);
  }
  return -1; // not a plausible match
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
    // Do NOT bail when Google isn't ready — the backend fallback below works on
    // every device, so the dropdown always gets results.

    let cancelled = false;

    // Each fetcher RETURNS an array (no state writes) so the caller can fall
    // through to the next source when one yields nothing.
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
      const out = [];
      (suggestions || []).forEach((s) => {
        const pp = s.placePrediction;
        if (!pp) return;
        const main = (pp.mainText && pp.mainText.text) || (pp.text && pp.text.text) || "";
        const sec = (pp.secondaryText && pp.secondaryText.text) || "";
        out.push({ placePrediction: pp, place_id: pp.placeId, mainText: main, secondaryText: sec });
      });
      return out;
    };

    const fetchClassic = () =>
      new Promise((resolve) => {
        try {
          const svc = new window.google.maps.places.AutocompleteService();
          svc.getPlacePredictions(
            { input: q, componentRestrictions: { country: "in" } },
            (preds, status) => {
              const OK = window.google.maps.places.PlacesServiceStatus?.OK || "OK";
              if (status !== OK || !preds) return resolve([]);
              resolve(preds.map((p) => ({
                classicPlaceId: p.place_id,
                place_id: p.place_id,
                mainText: (p.structured_formatting && p.structured_formatting.main_text) || p.description,
                secondaryText: (p.structured_formatting && p.structured_formatting.secondary_text) || "",
              })));
            }
          );
        } catch (e) { resolve([]); }
      });

    // Device-independent fallback — our own server proxies Nominatim, so this
    // works even when the client-side Google SDK is blocked (in-app browsers,
    // referrer-restricted key, etc.). Results already carry lat/lon.
    const fetchBackend = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/autocomplete`, {
          params: { q }, timeout: 8000,
        });
        return (data?.results || []).map((r) => ({
          backend: true,
          lat: r.lat, lon: r.lon,
          display_name: r.display_name,
          mainText: r.name,
          secondaryText: r.sub || "India",
        }));
      } catch (e) { return []; }
    };

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        let out = [];
        if (newPlacesReady()) { try { out = await fetchNew(); } catch (e) {} }
        if (!out.length && classicPlacesReady()) { try { out = await fetchClassic(); } catch (e) {} }
        if (!out.length) { out = await fetchBackend(); }
        if (!cancelled) setPredictions(out);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

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
      const mapped = predictions.map((p, i) => ({
        kind: p.backend ? "backend" : "google",
        name: p.mainText,
        sub: p.secondaryText || "India",
        place_id: p.place_id,
        placePrediction: p.placePrediction,   // present for the NEW API only
        classicPlaceId: p.classicPlaceId,     // present for the CLASSIC API only
        lat: p.lat, lon: p.lon,               // present for BACKEND results
        display_name: p.display_name,
        _i: i,                                 // original (source relevance) order
        _score: fuzzyScore(value, p.mainText, p.secondaryText),
      }));
      // Rank the closest / most similar matches first; keep the source order as
      // a stable tiebreaker. No results are dropped — only reordered.
      mapped.sort((a, b) => (b._score - a._score) || (a._i - b._i));
      return mapped;
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
    // Use the VISUAL viewport (the area ABOVE the on-screen keyboard). Many
    // mobile browsers keep window.innerHeight unchanged when the keyboard opens
    // and just overlay it, which caused the dropdown to be placed BEHIND the
    // keyboard for lower fields (e.g. "To"). visualViewport reflects the real
    // visible area, so we can flip the list above the input when needed.
    const ih = window.innerHeight || document.documentElement.clientHeight;
    const vv = window.visualViewport;
    const hasVV = !!vv;
    const visTop = vv ? vv.offsetTop : 0;
    const visBottom = vv ? vv.offsetTop + vv.height : ih;
    const GAP = 6;
    const spaceBelow = visBottom - r.bottom;   // room between input and keyboard/viewport bottom
    const spaceAbove = r.top - visTop;         // room above the input
    let below;
    if (hasVV) {
      // Accurate: visualViewport already excludes the keyboard.
      below = spaceBelow >= 200 || spaceBelow >= spaceAbove;
    } else {
      // Old Android / WebView without visualViewport: we can't detect the
      // keyboard, so if the field sits in the lower half of the screen assume
      // the keyboard will cover the area below and open the list UPWARD.
      const inputMidY = (r.top + r.bottom) / 2;
      const lowerHalf = inputMidY > ih * 0.5;
      below = !lowerHalf && spaceBelow >= 200;
    }
    const maxHeight = Math.max(
      150,
      Math.min(300, (below ? spaceBelow : spaceAbove) - GAP - 8)
    );
    setCoords({
      left: Math.round(r.left),
      width: Math.round(r.width),
      below,
      top: below ? Math.round(r.bottom + GAP) : undefined,
      // Anchor upward using the layout-viewport bottom (fixed coords are in the
      // layout frame); r.top is already in that frame.
      bottom: below ? undefined : Math.round((window.innerHeight || document.documentElement.clientHeight) - r.top + GAP),
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
    // The keyboard open/close fires visualViewport resize/scroll, not window resize.
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onMove);
      window.visualViewport.addEventListener("scroll", onMove);
    }
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onMove);
        window.visualViewport.removeEventListener("scroll", onMove);
      }
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
    // BACKEND (Nominatim) result already carries coordinates — select directly.
    if (opt.kind === "backend" || (opt.backend && opt.lat != null)) {
      onSelect({ display_name: opt.display_name || opt.name, lat: opt.lat, lon: opt.lon });
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
            // Use "auto" (never undefined) so the base CSS top/bottom rules
            // can't leak in and mis-place the list when it opens upward.
            top: coords.below ? coords.top : "auto",
            bottom: coords.below ? "auto" : coords.bottom,
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
                <span className="locsearch__text">
                  <span className="locsearch__name">{opt.name}</span>
                  {opt.sub && <span className="locsearch__sub">{opt.sub}</span>}
                </span>
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
            top: coords.below ? coords.top : "auto",
            bottom: coords.below ? "auto" : coords.bottom,
          }}
        >
          {loading ? "Searching…" : "No places found"}
        </div>,
        document.body
      )}
    </div>
  );
}
