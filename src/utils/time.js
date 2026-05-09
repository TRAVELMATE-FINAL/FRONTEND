// utils/time.js
// Shared 12-hour time formatter — every page should display ride times
// in 12-hour AM/PM form so the UI is consistent.
//
// Accepted inputs:
//   "06:00"          → "6:00 AM"
//   "18:30"          → "6:30 PM"
//   "23:05:00"       → "11:05 PM"
//   "9:5"            → "9:05 AM"
//   "" / null / NaN  → "—"

export function formatTime12h(time) {
  if (time === undefined || time === null || time === "") return "—";

  const str = String(time).trim();
  // Already-formatted strings ("3:00 PM") flow through untouched
  if (/[ap]m\s*$/i.test(str)) return str.toUpperCase().replace(/\s+/g, " ");

  const [hStr = "", mStr = "00"] = str.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return str;

  const m = String(parseInt(mStr, 10) || 0).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m} ${ap}`;
}

// Build a "Date • 6:00 PM" style label
export function formatDateTime12h(date, time) {
  const d = (date || "").trim();
  const t = formatTime12h(time);
  if (!d) return t;
  return `${d} • ${t}`;
}

export default formatTime12h;
