// services/session.js
// ──────────────────────────────────────────────────────────────────────────
// Client-side login session with a TWO-WEEK expiry.
//
// Goal: users should NOT have to log in every time they open the web app.
// A login stays valid for 14 days. As long as the user opens the app at
// least once within any 14-day window, the session slides forward and they
// stay logged in. Only after 14 full days of NOT opening the app does the
// login expire and a fresh OTP login becomes mandatory.
//
// The whole app identifies "logged in" by the presence of localStorage
// "phone". This module guards that value behind an expiry timestamp stored
// in "loginExpiry" (epoch milliseconds).
// ──────────────────────────────────────────────────────────────────────────

const PHONE_KEY = "phone";
const EXPIRY_KEY = "loginExpiry";

// 14 days in milliseconds.
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// Begin (or refresh) a logged-in session for `phone`. Called right after a
// successful OTP verification. Sets the expiry to 14 days from now.
export function startSession(phone) {
  try {
    if (phone) localStorage.setItem(PHONE_KEY, phone);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS));
  } catch (e) {
    /* localStorage unavailable — ignore */
  }
}

// Fully sign the user out (used by the logout button and on expiry).
export function clearSession() {
  try {
    localStorage.removeItem(PHONE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch (e) {
    /* ignore */
  }
}

// Core guard. Returns the phone if the session is still valid, otherwise
// clears it and returns "". Side effect: when still valid it slides the
// expiry forward to 14 days from now (the "sliding window" that keeps active
// users logged in). Call this once on app start.
export function enforceSession() {
  let phone = "";
  try { phone = localStorage.getItem(PHONE_KEY) || ""; } catch (e) { phone = ""; }
  if (!phone) return "";

  let expiry = 0;
  try { expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0); } catch (e) { expiry = 0; }

  // Grandfather logins that predate this feature: a phone is present but no
  // expiry was ever stored. Treat it as a fresh 14-day window starting now
  // rather than logging the user out unexpectedly.
  if (!expiry) {
    startSession(phone);
    return phone;
  }

  // Expired → 14+ days since the last visit. Force a fresh login.
  if (Date.now() > expiry) {
    clearSession();
    return "";
  }

  // Still valid → slide the window forward so the user stays logged in.
  try { localStorage.setItem(EXPIRY_KEY, String(Date.now() + SESSION_TTL_MS)); } catch (e) { /* ignore */ }
  return phone;
}

// Convenience boolean used by guards/UI.
export function isLoggedIn() {
  return !!enforceSession();
}
