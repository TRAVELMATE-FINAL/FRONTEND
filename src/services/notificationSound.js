// services/notificationSound.js
// ---------------------------------------------------------------------------
// Plays a short alarm-style chime when a NEW in-app notification arrives while
// the app is open. No audio file needed — the tone is synthesized with the Web
// Audio API, so it works offline and on every modern browser, with a graceful
// no-op where Web Audio is unavailable (older devices).
//
// Browser autoplay rules: audio can't play until the user has interacted with
// the page at least once. We "unlock" the audio context on the first user
// gesture (click / touch / key), after which programmatic playback works.
//
// The caller (Header) decides WHEN to play and handles de-duplication so the
// same notification never chimes twice.
// ---------------------------------------------------------------------------

const PREF_KEY = "notifSoundEnabled";

let audioCtx = null;
let unlocked = false;

// Default ON unless the user turned it off.
export function isSoundEnabled() {
  try {
    return localStorage.getItem(PREF_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(PREF_KEY, on ? "1" : "0");
  } catch {}
}

function getCtx() {
  if (audioCtx) return audioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;           // very old browser — silently skip
    audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

// Call once from a real user gesture to satisfy autoplay policies.
export function unlockNotificationAudio() {
  if (unlocked) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();
    // Play an inaudible blip so the context is fully "running".
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  } catch {}
}

// Attach the one-time unlock listeners (safe to call multiple times).
let listenersAttached = false;
export function armNotificationAudioUnlock() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  const handler = () => {
    unlockNotificationAudio();
    if (unlocked) {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("click", handler);
    }
  };
  window.addEventListener("pointerdown", handler, { passive: true });
  window.addEventListener("touchstart", handler, { passive: true });
  window.addEventListener("keydown", handler);
  window.addEventListener("click", handler, { passive: true });
}

// Play a short two-tone alarm chime. Respects the user's setting and the
// autoplay unlock. Never throws.
export function playNotificationSound() {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();
    if (ctx.state !== "running") return; // not unlocked yet — skip silently

    const now = ctx.currentTime;
    // Alarm-style: three quick rising beeps.
    const beeps = [
      { f: 880,  t: 0.00 },
      { f: 1175, t: 0.18 },
      { f: 1568, t: 0.36 },
    ];
    beeps.forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(f, now + t);
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.16);
    });
  } catch {}
}
