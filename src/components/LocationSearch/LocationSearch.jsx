// components/LocationSearch/LocationSearch.jsx
// Tamil Nadu districts autocomplete: as the user types,
// filter the 38 districts whose names start with the typed letters
// and show them in a dropdown. On select, calls onSelect with
// { display_name, lat, lon } so the parent can store coordinates.

import { useState, useRef, useEffect, useMemo } from "react";
import "./LocationSearch.css";

// All 38 Tamil Nadu districts with approximate centroid lat/lon.
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

export default function LocationSearch({
  placeholder = "Search location",
  value = "",
  onChange = () => {},
  onSelect = () => {},
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  // Filter — case-insensitive "starts with" on the first letter typed,
  // and "contains" once they've typed more (more forgiving).
  const matches = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return [];
    if (q.length === 1) {
      return TN_DISTRICTS.filter((d) => d.name.toLowerCase().startsWith(q));
    }
    return TN_DISTRICTS.filter((d) => d.name.toLowerCase().includes(q));
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Reset highlight whenever the list shrinks
  useEffect(() => {
    setHighlight(0);
  }, [matches.length]);

  const pick = (d) => {
    onSelect({ display_name: d.name, lat: d.lat, lon: d.lon });
    setOpen(false);
  };

  const handleKey = (e) => {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[highlight]);
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

      {open && matches.length > 0 && (
        <ul className="locsearch__dropdown" role="listbox">
          {matches.map((d, i) => (
            <li
              key={d.name}
              role="option"
              aria-selected={i === highlight}
              className={
                "locsearch__option" +
                (i === highlight ? " locsearch__option--active" : "")
              }
              onMouseEnter={() => setHighlight(i)}
              // onMouseDown (not onClick) so it fires before input blur
              onMouseDown={(e) => {
                e.preventDefault();
                pick(d);
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
              <span className="locsearch__name">{d.name}</span>
              <span className="locsearch__sub">Tamil Nadu</span>
            </li>
          ))}
        </ul>
      )}

      {open && value && matches.length === 0 && (
        <div className="locsearch__empty">No matching Tamil Nadu district</div>
      )}
    </div>
  );
}
