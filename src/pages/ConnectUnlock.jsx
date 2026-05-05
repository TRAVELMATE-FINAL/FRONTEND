import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:5000";

// ── Icons ────────────────────────────────────────────────────────────────────
const ClockIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);
const UsersIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const LockIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const EyeIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const UnlockIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);
const CheckIcon = () => (
  <svg width="28" height="28" fill="none" stroke="#22c55e" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

// ── Format helpers ───────────────────────────────────────────────────────────
function formatDateTime(date, time) {
  if (!date && !time) return "—";
  // date = "YYYY-MM-DD", time = "HH:MM"
  const d = new Date(`${date}T${time || "00:00"}`);
  if (isNaN(d.getTime())) return `${date || ""} ${time || ""}`.trim();

  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  const period = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const timeLabel = `${h12}:${mm} ${period}`;

  if (sameDay)    return `Today, ${timeLabel}`;
  if (isTomorrow) return `Tomorrow, ${timeLabel}`;

  const opts = { day: "numeric", month: "short" };
  return `${d.toLocaleDateString("en-IN", opts)}, ${timeLabel}`;
}

// ── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  .cu-root * { box-sizing: border-box; margin: 0; padding: 0; }
  .cu-root {
    font-family: 'DM Sans', sans-serif;
    background: #f0f2f5;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .cu-page-header {
    width: 100%;
    max-width: 900px;
    padding: 18px 16px 10px;
    font-size: 13px;
    color: #555;
    font-weight: 500;
  }
  .cu-main {
    display: flex;
    gap: 16px;
    width: 100%;
    max-width: 900px;
    padding: 0 16px 32px;
    align-items: flex-start;
  }
  .cu-left  { flex: 1; display: flex; flex-direction: column; gap: 12px; }
  .cu-right { width: 260px; flex-shrink: 0; }
  .cu-card {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #e8eaed;
    padding: 20px;
  }
  .cu-driver-top { display: flex; align-items: flex-start; justify-content: space-between; }
  .cu-driver-left { display: flex; align-items: center; gap: 12px; }
  .cu-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 18px; font-weight: 700; flex-shrink: 0;
    overflow: hidden;
  }
  .cu-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .cu-driver-name { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 4px; }
  .cu-rating {
    display: inline-flex; align-items: center; gap: 4px;
    background: #fff8e1; border: 1px solid #ffc107;
    border-radius: 20px; padding: 2px 9px;
    font-size: 12px; font-weight: 600; color: #f59e0b;
  }
  .cu-more {
    background: none; border: none; cursor: pointer;
    color: #888; font-size: 20px; padding: 2px 6px;
    border-radius: 6px; line-height: 1;
  }
  .cu-more:hover { background: #f5f5f5; }
  .cu-route { margin-top: 16px; display: flex; flex-direction: column; gap: 0; }
  .cu-route-item { display: flex; gap: 10px; align-items: flex-start; }
  .cu-dot-col { display: flex; flex-direction: column; align-items: center; width: 14px; padding-top: 4px; }
  .cu-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .cu-dot-blue  { background: #3b82f6; }
  .cu-dot-green { background: #22c55e; }
  .cu-route-line {
    width: 2px; height: 28px;
    background: repeating-linear-gradient(to bottom, #ccc 0, #ccc 4px, transparent 4px, transparent 8px);
    margin: 3px 0;
  }
  .cu-city { font-size: 13px; font-weight: 600; color: #111; }
  .cu-sub  { font-size: 11px; color: #888; margin-top: 1px; }
  .cu-vehicle-title { font-size: 15px; font-weight: 700; color: #111; margin-bottom: 12px; }
  .cu-model-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: #e8f5e9; color: #2e7d32;
    font-size: 11px; font-weight: 600;
    border-radius: 6px; padding: 3px 9px; margin-bottom: 14px;
    border: 1px solid #c8e6c9;
  }
  .cu-model-dot { width: 8px; height: 8px; border-radius: 50%; background: #4caf50; }
  .cu-vehicle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
  .cu-field-label { font-size: 11px; color: #888; font-weight: 500; display: block; margin-bottom: 2px; }
  .cu-field-val { font-size: 13px; font-weight: 600; color: #111; }
  .cu-plate-blur {
    display: inline-block;
    background: #e0e0e0; color: transparent;
    border-radius: 4px; font-size: 13px;
    user-select: none; letter-spacing: 2px;
    filter: blur(4px); font-weight: 600;
  }
  .cu-info-title { font-size: 14px; font-weight: 700; color: #111; margin-bottom: 6px; }
  .cu-info-text  { font-size: 12px; color: #555; line-height: 1.6; }
  .cu-views {
    background: #e8f4fd; border-radius: 12px;
    border: 1px solid #bde0f7; padding: 11px 16px;
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: #1a73e8; font-weight: 500;
  }
  .cu-panel {
    background: #fff; border-radius: 14px;
    border: 1px solid #e8eaed; padding: 18px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .cu-meta-row {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: #555; font-weight: 500;
  }
  .cu-contact-field {
    border: 1px solid #e0e0e0; border-radius: 8px;
    padding: 10px 12px;
    display: flex; align-items: center; justify-content: space-between;
    font-family: 'DM Sans', sans-serif;
  }
  .cu-contact-placeholder { font-size: 12px; color: #aaa; font-weight: 500; letter-spacing: 1px; }
  .cu-lock-color { color: #bbb; }
  .cu-warning {
    display: flex; align-items: center; gap: 6px;
    background: #fff5f5; border: 1px solid #fecaca;
    border-radius: 8px; padding: 9px 12px;
    font-size: 12px; color: #dc2626; font-weight: 600;
  }
  .cu-unlock-btn {
    background: #f59e0b; color: #fff; border: none;
    border-radius: 10px; padding: 13px; width: 100%;
    font-size: 14px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.2s, transform 0.1s;
    letter-spacing: 0.01em;
  }
  .cu-unlock-btn:hover  { background: #d97706; }
  .cu-unlock-btn:active { transform: scale(0.98); }
  .cu-unlock-btn:disabled { background: #d4a464; cursor: not-allowed; }
  .cu-secure { text-align: center; font-size: 10.5px; color: #aaa; }

  .cu-loading, .cu-error-page {
    width: 100%; max-width: 900px; padding: 80px 16px;
    text-align: center; color: #555; font-size: 14px;
  }
  .cu-error-page { color: #dc2626; }

  .cu-footer { background: #2d3142; color: #ccc; width: 100%; padding: 32px 0 20px; margin-top: 8px; }
  .cu-footer-inner {
    max-width: 900px; margin: 0 auto;
    display: grid; grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 24px; padding: 0 16px;
  }
  .cu-footer-brand-name { color: #fff; font-size: 15px; font-weight: 700; margin-bottom: 8px; }
  .cu-footer-brand-text { font-size: 11px; color: #9a9eb5; line-height: 1.7; }
  .cu-footer-col-title  { color: #fff; font-size: 12px; font-weight: 700; margin-bottom: 10px; }
  .cu-footer-link {
    display: block; font-size: 11px; color: #9a9eb5;
    text-decoration: none; margin-bottom: 5px;
    transition: color 0.2s;
  }
  .cu-footer-link:hover { color: #fff; }
  .cu-social-icons { display: flex; gap: 10px; margin-top: 4px; }
  .cu-social-icon {
    width: 28px; height: 28px; border-radius: 6px;
    background: #3d4260;
    display: flex; align-items: center; justify-content: center;
    color: #ccc; text-decoration: none; font-size: 11px; font-weight: 700;
    transition: background 0.2s, color 0.2s;
  }
  .cu-social-icon:hover { background: #f59e0b; color: #fff; }
  .cu-footer-bottom {
    max-width: 900px; margin: 20px auto 0;
    padding: 14px 16px 0;
    border-top: 1px solid #3d4260;
    font-size: 11px; color: #9a9eb5; text-align: center;
  }

  .cu-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 100;
    display: flex; align-items: center; justify-content: center;
    animation: cu-fade-in 0.2s ease;
  }
  @keyframes cu-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .cu-modal {
    background: #fff; border-radius: 16px;
    padding: 28px 24px; width: 300px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: cu-pop-in 0.25s ease;
  }
  @keyframes cu-pop-in { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .cu-modal-check {
    width: 56px; height: 56px; border-radius: 50%;
    background: #ecfdf5; margin: 0 auto 14px;
    display: flex; align-items: center; justify-content: center;
  }
  .cu-modal-title { font-size: 17px; font-weight: 700; color: #111; margin-bottom: 6px; }
  .cu-modal-sub   { font-size: 13px; color: #666; margin-bottom: 18px; }
  .cu-contact-revealed {
    background: #f0f9ff; border: 1px solid #bae6fd;
    border-radius: 10px; padding: 12px;
    font-size: 18px; font-weight: 700; color: #0ea5e9;
    letter-spacing: 2px; margin-bottom: 18px;
  }
  .cu-modal-close {
    background: #2d3142; color: #fff; border: none;
    border-radius: 10px; padding: 12px 28px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    font-family: 'DM Sans', sans-serif; width: 100%;
    transition: background 0.2s;
  }
  .cu-modal-close:hover { background: #3d4462; }

  /* ─────────── RESPONSIVE ─────────── */
  @media (max-width: 1024px) {
    .cu-main { max-width: 100%; padding: 0 14px 24px; }
    .cu-page-header { max-width: 100%; padding: 14px 14px 8px; }
    .cu-right { width: 240px; }
    .cu-footer-inner { max-width: 100%; padding: 0 14px; }
  }

  @media (max-width: 760px) {
    .cu-main { flex-direction: column; gap: 12px; }
    .cu-left, .cu-right { width: 100%; flex: none; }
    .cu-vehicle-grid { grid-template-columns: 1fr; gap: 10px; }
    .cu-footer-inner { grid-template-columns: 1fr 1fr; gap: 18px; }
    .cu-modal { width: 90%; max-width: 320px; }
  }

  @media (max-width: 480px) {
    .cu-page-header { font-size: 12px; padding: 12px 12px 6px; }
    .cu-card { padding: 16px; }
    .cu-panel { padding: 14px; }
    .cu-driver-name { font-size: 15px; }
    .cu-rating { font-size: 11px; }
    .cu-vehicle-title { font-size: 14px; }
    .cu-info-title { font-size: 13px; }
    .cu-views { font-size: 11px; padding: 9px 12px; }
    .cu-unlock-btn { padding: 12px; font-size: 13px; }
    .cu-footer-inner { grid-template-columns: 1fr; gap: 16px; }
    .cu-contact-revealed { font-size: 16px; letter-spacing: 1px; }
  }
`;

function StyleInjector() {
  if (typeof document !== "undefined" && !document.getElementById("cu-styles")) {
    const tag = document.createElement("style");
    tag.id = "cu-styles";
    tag.textContent = STYLES;
    document.head.appendChild(tag);
  }
  return null;
}

function DriverCard({ user, ride }) {
  const initial = (user?.fullName || "T").trim().charAt(0).toUpperCase();
  return (
    <div className="cu-card">
      <div className="cu-driver-top">
        <div className="cu-driver-left">
          <div className="cu-avatar">
            {user?.photo ? <img src={user.photo} alt={user.fullName} /> : initial}
          </div>
          <div>
            <div className="cu-driver-name">{user?.fullName || "TravelMate Rider"}</div>
            <span className="cu-rating">⭐ 4.8 (43)</span>
          </div>
        </div>
        <button className="cu-more">•••</button>
      </div>

      <div className="cu-route">
        <div className="cu-route-item">
          <div className="cu-dot-col">
            <div className="cu-dot cu-dot-blue" />
            <div className="cu-route-line" />
          </div>
          <div>
            <div className="cu-city">{ride?.from || "—"}</div>
            <div className="cu-sub">Starting point</div>
          </div>
        </div>
        <div className="cu-route-item" style={{ marginTop: 0 }}>
          <div className="cu-dot-col" style={{ paddingTop: 2 }}>
            <div className="cu-dot cu-dot-green" />
          </div>
          <div>
            <div className="cu-city">{ride?.to || "—"}</div>
            <div className="cu-sub">Destination</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ ride }) {
  const v = ride?.vehicle || "Bike";
  const model = ride?.vehicleModel || (v === "Car" ? "Sedan" : "Standard");
  const color = ride?.vehicleColor || "—";
  const plate = ride?.plateNumber || "TN00 XX0000";
  return (
    <div className="cu-card">
      <div className="cu-vehicle-title">Vehicle Details</div>
      <div className="cu-model-badge">
        <div className="cu-model-dot" />
        {model}
      </div>
      <div className="cu-vehicle-grid">
        <div>
          <span className="cu-field-label">Vehicle</span>
          <div className="cu-field-val">{model}</div>
        </div>
        <div>
          <span className="cu-field-label">Color</span>
          <div className="cu-field-val">{color}</div>
        </div>
        <div>
          <span className="cu-field-label">Plate Number</span>
          <span className="cu-plate-blur">{plate}</span>
        </div>
        <div>
          <span className="cu-field-label">Type</span>
          <div className="cu-field-val">{v}</div>
        </div>
      </div>
    </div>
  );
}

function AdditionalInfo({ ride }) {
  const text = ride?.additionalInfo?.trim()
    || `${ride?.distance || ""} • ${ride?.duration || ""}`.trim()
    || "No extra notes from the rider.";
  return (
    <div className="cu-card">
      <div className="cu-info-title">Additional Information</div>
      <p className="cu-info-text">{text}</p>
    </div>
  );
}

function ViewsBanner({ count }) {
  return (
    <div className="cu-views">
      <EyeIcon />
      {count || 1} {count === 1 ? "person" : "people"} viewed this ride
    </div>
  );
}

function RightPanel({ ride, user, onUnlock, unlocking }) {
  const seats = typeof ride?.seatsAvailable === "number" ? ride.seatsAvailable : 1;
  const masked = user?.maskedPhone || "Contact Number";
  return (
    <div className="cu-panel">
      <div className="cu-meta-row">
        <ClockIcon /> {formatDateTime(ride?.date, ride?.time)}
      </div>
      <div className="cu-meta-row">
        <UsersIcon /> {seats} {seats === 1 ? "seat" : "seats"} available
      </div>

      <div className="cu-contact-field">
        <span className="cu-contact-placeholder">{masked}</span>
        <span className="cu-lock-color"><LockIcon /></span>
      </div>

      {seats > 0 && seats <= 2 && (
        <div className="cu-warning">
          <AlertIcon /> Only {seats} {seats === 1 ? "seat" : "seats"} left!
        </div>
      )}

      <button className="cu-unlock-btn" onClick={onUnlock} disabled={unlocking}>
        <UnlockIcon /> {unlocking ? "Unlocking…" : "Unlock Contact"}
      </button>

      <div className="cu-secure">Secure payment • Get contact instantly</div>
    </div>
  );
}

function UnlockModal({ phone, driverName, onClose }) {
  return (
    <div className="cu-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cu-modal">
        <div className="cu-modal-check"><CheckIcon /></div>
        <div className="cu-modal-title">Contact Unlocked!</div>
        <p className="cu-modal-sub">You can now reach out to {driverName || "the rider"} directly.</p>
        <div className="cu-contact-revealed">{phone}</div>
        <button className="cu-modal-close" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="cu-footer">
      <div className="cu-footer-inner">
        <div>
          <div className="cu-footer-brand-name">Friend Travel</div>
          <p className="cu-footer-brand-text">Share rides, save money, and<br />travel together across India.</p>
        </div>
        <div>
          <div className="cu-footer-col-title">Quick Links</div>
          <a href="/find-ride" className="cu-footer-link">Find Ride</a>
          <a href="/post-ride" className="cu-footer-link">Post Ride</a>
          <a href="/find-friend" className="cu-footer-link">My Trips</a>
        </div>
        <div>
          <div className="cu-footer-col-title">Support</div>
          <a href="#" className="cu-footer-link">Help Center</a>
          <a href="#" className="cu-footer-link">Safety</a>
          <a href="#" className="cu-footer-link">Terms</a>
        </div>
        <div>
          <div className="cu-footer-col-title">Connect</div>
          <div className="cu-social-icons">
            <a href="#" className="cu-social-icon">f</a>
            <a href="#" className="cu-social-icon">in</a>
            <a href="#" className="cu-social-icon">tw</a>
            <a href="#" className="cu-social-icon">✉</a>
          </div>
        </div>
      </div>
      <div className="cu-footer-bottom">© 2026 Friend Travel. All rights reserved.</div>
    </footer>
  );
}

export default function ConnectUnlock() {
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get("rideId");

  const [ride, setRide] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [unlocking, setUnlocking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState("");

  useEffect(() => {
    if (!rideId) {
      setError("No ride selected. Open a ride from Find Friends to continue.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/api/rides/${rideId}/connect`);
        if (cancelled) return;
        setRide(data?.data?.ride || null);
        setUser(data?.data?.user || null);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.error || "Could not load ride details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rideId]);

  const handleUnlock = async () => {
    if (!rideId) return;
    try {
      setUnlocking(true);
      const { data } = await axios.post(`${API_BASE}/api/rides/${rideId}/unlock`);
      setRevealedPhone(data?.data?.phone || "");
      setShowModal(true);
    } catch (err) {
      alert(err.response?.data?.error || "Could not unlock contact");
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <>
      <StyleInjector />
      <div className="cu-root">
        <div className="cu-page-header">Connect &amp; unlock</div>

        {loading && <div className="cu-loading">Loading ride details…</div>}
        {!loading && error && <div className="cu-error-page">⚠️ {error}</div>}

        {!loading && !error && ride && (
          <div className="cu-main">
            <div className="cu-left">
              <DriverCard user={user} ride={ride} />
              <VehicleCard ride={ride} />
              <AdditionalInfo ride={ride} />
              <ViewsBanner count={ride.viewCount} />
            </div>

            <div className="cu-right">
              <RightPanel
                ride={ride}
                user={user}
                onUnlock={handleUnlock}
                unlocking={unlocking}
              />
            </div>
          </div>
        )}

        <Footer />

        {showModal && (
          <UnlockModal
            phone={revealedPhone}
            driverName={user?.fullName}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </>
  );
}
