// services/pendingIntent.js
// ---------------------------------------------------------------------------
// "Pending intent" breadcrumbs steer the user back to a specific screen after
// they log in (e.g. they tapped "Unlock Contact" or "Publish Ride" while
// logged out, verified OTP, and should return to that exact step).
//
// The bug this guards against: these keys used to be plain localStorage values
// that were often NOT cleared when a flow was abandoned. A stale key would then
// hijack a later, unrelated login and wrongly redirect the user to the Find
// Ride → Payment page.
//
// Rules enforced here:
//   • Every intent is written with a timestamp.
//   • On read, an intent older than TTL_MS is treated as absent (and purged).
//   • Intents are single-use: reading one clears it.
// ---------------------------------------------------------------------------

// How long a pending intent stays valid after it's set. Long enough to cover a
// real OTP round-trip, short enough that an abandoned flow can't resurface in a
// later session.
export const INTENT_TTL_MS = 15 * 60 * 1000; // 15 minutes

const INTENT_KEYS = ["pendingPayRideId", "pendingUnlockRideId", "pendingPostRide"];
const tsKey = (key) => `${key}__ts`;

// Write an intent + its timestamp.
export function setPendingIntent(key, value) {
  try {
    localStorage.setItem(key, String(value));
    localStorage.setItem(tsKey(key), String(Date.now()));
  } catch (_e) {}
}

// Remove an intent and its timestamp.
export function clearPendingIntent(key) {
  try {
    localStorage.removeItem(key);
    localStorage.removeItem(tsKey(key));
  } catch (_e) {}
}

// Read an intent WITHOUT consuming it. Returns "" if missing or expired
// (expired values are purged as a side effect).
export function peekPendingIntent(key) {
  try {
    const val = localStorage.getItem(key);
    if (!val) return "";
    const ts = Number(localStorage.getItem(tsKey(key)) || 0);
    // Treat a value with no/old timestamp as stale — it predates this guard or
    // has simply expired. Either way, don't act on it.
    if (!ts || Date.now() - ts > INTENT_TTL_MS) {
      clearPendingIntent(key);
      return "";
    }
    return val;
  } catch {
    return "";
  }
}

// Read an intent and consume it (single-use). Returns "" if missing/expired.
export function takePendingIntent(key) {
  const val = peekPendingIntent(key);
  clearPendingIntent(key);
  return val;
}

// Nuke every pending intent — used after a post-login redirect decision so no
// leftover breadcrumb can affect a future navigation.
export function clearAllPendingIntents() {
  INTENT_KEYS.forEach(clearPendingIntent);
}
