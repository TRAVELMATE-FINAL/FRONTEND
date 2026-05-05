import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import LocationSearch from '../components/LocationSearch/LocationSearch';
import './PostRide.css';

// ── Auto-fit map to route bounds ──────────────────────────────────────────────
function FitRoute({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 1) {
      map.fitBounds(coords, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

// ── Truncate long place names ─────────────────────────────────────────────────
function truncate(str, max = 28) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ── Local-time YYYY-MM-DD helpers (avoid UTC off-by-one) ─────────────────────
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const getTodayISO    = () => toISODate(new Date());
const getTomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
};

const API = 'http://localhost:5000';

// ── Sidebar nav with icons ────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const navItems = [
  { to: '/post',         label: 'Post Ride',    Icon: IconPlus },
  { to: '/notification', label: 'Notification', Icon: IconBell },
  { to: '/profile',      label: 'Profile',      Icon: IconUser },
];

export default function PostRide() {
  // ── Form state ────────────────────────────────────────────────────────────
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords,   setToCoords]   = useState(null);
  const [date,       setDate]       = useState('');
  const [time,       setTime]       = useState('');
  const [gender,     setGender]     = useState(''); // 'male' | 'female' | ''

  // ── Route result state ────────────────────────────────────────────────────
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance,    setDistance]    = useState('');
  const [duration,    setDuration]    = useState('');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [routeLoading, setRouteLoading] = useState(false);
  const [saveLoading,  setSaveLoading]  = useState(false);
  const [toast,        setToast]        = useState(null); // { type: 'success'|'error', msg }

  // ── Show a toast for 3 seconds ────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Resolve coordinates (autocomplete coords → geocode fallback) ──────────
  const resolveCoords = async () => {
    let fromLat, fromLon, toLat, toLon;

    if (fromCoords) {
      fromLat = parseFloat(fromCoords.lat);
      fromLon = parseFloat(fromCoords.lon);
    } else {
      const r = await axios.get(`${API}/api/geocode?q=${encodeURIComponent(from)}`);
      fromLat = r.data.lat;
      fromLon = r.data.lon;
    }

    if (toCoords) {
      toLat = parseFloat(toCoords.lat);
      toLon = parseFloat(toCoords.lon);
    } else {
      await new Promise(res => setTimeout(res, 800)); // avoid Nominatim 429
      const r = await axios.get(`${API}/api/geocode?q=${encodeURIComponent(to)}`);
      toLat = r.data.lat;
      toLon = r.data.lon;
    }

    return { fromLat, fromLon, toLat, toLon };
  };

  // ── FIND ROUTE — draws path on map ────────────────────────────────────────
  const handleFindRoute = async () => {
    if (!from || !to) {
      showToast('error', 'Enter both starting location and destination');
      return;
    }

    setRouteLoading(true);
    try {
      const { fromLat, fromLon, toLat, toLon } = await resolveCoords();

      const routeRes = await axios.get(
        `${API}/api/route?fromLat=${fromLat}&fromLng=${fromLon}&toLat=${toLat}&toLng=${toLon}`
      );

      const coords = routeRes.data.geometry.map(c => [c[1], c[0]]);
      setRouteCoords(coords);
      setDistance(routeRes.data.distance);
      setDuration(routeRes.data.duration);
    } catch (err) {
      console.error('Route error:', err);
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        showToast('error', '❌ Backend not reachable — is "node server.js" running?');
      } else if (err.response?.status === 404) {
        showToast('error', '❌ No route found between those locations.');
      } else if (err.response?.data?.error) {
        showToast('error', `❌ ${err.response.data.error}`);
      } else {
        showToast('error', `❌ ${err.message || 'Could not find route.'}`);
      }
    } finally {
      setRouteLoading(false);
    }
  };

  // ── POST RIDE — saves to MongoDB Atlas ────────────────────────────────────
  const handlePostRide = async () => {
    if (!from || !to)   { showToast('error', 'Enter starting location and destination'); return; }
    if (!date)          { showToast('error', 'Please select a date'); return; }
    if (!time)          { showToast('error', 'Please select a time'); return; }

    setSaveLoading(true);
    try {
      // Resolve coords (needed for storing location properly)
      let fromLat = null, fromLon = null, toLat = null, toLon = null;
      let dist = distance, dur = duration;

      try {
        const coords = await resolveCoords();
        fromLat = coords.fromLat;
        fromLon = coords.fromLon;
        toLat   = coords.toLat;
        toLon   = coords.toLon;

        // If route not found yet, fetch it now so we can store distance/duration
        if (!distance) {
          const routeRes = await axios.get(
            `${API}/api/route?fromLat=${fromLat}&fromLng=${fromLon}&toLat=${toLat}&toLng=${toLon}`
          );
          dist = routeRes.data.distance;
          dur  = routeRes.data.duration;
          const coords2 = routeRes.data.geometry.map(c => [c[1], c[0]]);
          setRouteCoords(coords2);
          setDistance(dist);
          setDuration(dur);
        }
      } catch {
        // coords/route failed — still save the ride with what we have
      }

      // ── Save to MongoDB ─────────────────────────────────────────────────
      const res = await axios.post(`${API}/api/rides`, {
        from,
        to,
        fromLat,
        fromLon,
        toLat,
        toLon,
        date,
        time,
        gender,
        distance: dist || '',
        duration: dur  || '',
      });

      if (res.status === 201) {
        showToast('success', '✅ Ride posted and saved to database!');
        // Reset form
        setFrom('');       setTo('');
        setFromCoords(null); setToCoords(null);
        setDate('');       setTime('');
        setGender('');
        setDistance('');   setDuration('');
        setRouteCoords([]);
      }
    } catch (err) {
      console.error('Save error:', err);
      const msg = err.response?.data?.error || 'Failed to save ride. Is the backend running?';
      showToast('error', msg);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="postride">
      {/* Sidebar */}
      <aside className="postride__sidebar">
        <div className="postride__logo">TravelMate</div>
        <nav className="postride__nav">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `postride__nav-item${isActive ? ' postride__nav-item--active' : ''}`
              }
            >
              <span className="postride__nav-icon"><Icon /></span>
              <span className="postride__nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="postride__trust">
          <p className="postride__trust-title">Travel with trust</p>
          <p className="postride__trust-desc">Verified users · Safe community</p>
        </div>
      </aside>

      {/* Main */}
      <main className="postride__main">
        <div className="postride__heading">
          <h1 className="postride__title">Post</h1>
          <p className="postride__subtitle">Share your journey with others</p>
        </div>

        {/* Toast notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              className={`postride__toast postride__toast--${toast.type}`}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="postride__card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* From */}
          <div className="postride__field">
            <label className="postride__field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              From
            </label>
            <LocationSearch
              placeholder="Starting location"
              value={from}
              onChange={(val) => { setFrom(val); setFromCoords(null); }}
              onSelect={(item) => { setFrom(item.display_name); setFromCoords({ lat: item.lat, lon: item.lon }); }}
            />
          </div>

          {/* To */}
          <div className="postride__field">
            <label className="postride__field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              To
            </label>
            <LocationSearch
              placeholder="Destination"
              value={to}
              onChange={(val) => { setTo(val); setToCoords(null); }}
              onSelect={(item) => { setTo(item.display_name); setToCoords({ lat: item.lat, lon: item.lon }); }}
            />
          </div>

          {/* Date + Time row */}
          <div className="postride__row postride__row--datetime">
            <div className="postride__date-field">
              <label className="postride__field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Date
              </label>
              <div className="postride__date-quick">
                <button
                  type="button"
                  className={`postride__date-pill${date === getTodayISO() ? ' postride__date-pill--active' : ''}`}
                  onClick={() => setDate(getTodayISO())}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`postride__date-pill${date === getTomorrowISO() ? ' postride__date-pill--active' : ''}`}
                  onClick={() => setDate(getTomorrowISO())}
                >
                  Tomorrow
                </button>
              </div>
              <input
                className="postride__input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="postride__time-field">
              <label className="postride__field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Time
              </label>
              <input
                className="postride__input postride__input--time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Gender selector */}
          <div className="postride__gender">
            <button
              type="button"
              className={`postride__gender-btn${gender === 'male' ? ' postride__gender-btn--active' : ''}`}
              onClick={() => setGender('male')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Male
            </button>
            <button
              type="button"
              className={`postride__gender-btn${gender === 'female' ? ' postride__gender-btn--active' : ''}`}
              onClick={() => setGender('female')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Female
            </button>
          </div>

          {/* Action buttons */}
          <div className="postride__actions">
            <button
              className="postride__btn postride__btn--outline"
              onClick={handleFindRoute}
              disabled={routeLoading || saveLoading}
            >
              {routeLoading ? 'Finding...' : '🗺️ Find Route'}
            </button>

            <button
              className="postride__btn postride__btn--primary"
              onClick={handlePostRide}
              disabled={saveLoading || routeLoading}
            >
              {saveLoading ? 'Saving...' : '🚀 Post Ride'}
            </button>
          </div>

          {/* Confirm your route — shown after route loads */}
          {(distance || duration) && (from || to) && (
            <div className="postride__route-section">
              <p className="postride__route-label">Confirm your route</p>
              <div className="postride__route-card">
                <div className="postride__route-endpoints">
                  <div className="postride__route-point">
                    <div className="postride__point-badge postride__point-badge--a">A</div>
                    <div>
                      <p className="postride__point-tag">From</p>
                      <p className="postride__point-name">{truncate(from, 22)}</p>
                    </div>
                  </div>
                  <div className="postride__route-arrow">
                    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                      <path d="M1 7h18m0 0l-5-5m5 5l-5 5" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="postride__route-point postride__route-point--right">
                    <div className="postride__point-badge postride__point-badge--b">B</div>
                    <div>
                      <p className="postride__point-tag">To</p>
                      <p className="postride__point-name">{truncate(to, 22)}</p>
                    </div>
                  </div>
                </div>
                <div className="postride__route-meta">
                  {duration && (
                    <span className="postride__route-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className="postride__route-meta-value">{duration}</span>
                    </span>
                  )}
                  {distance && (
                    <span className="postride__route-meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m-6 3l6-3" />
                      </svg>
                      <span className="postride__route-meta-value">{distance}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* OpenStreetMap */}
          <div className="postride__map">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: '300px', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Auto-pan to fit route */}
              {routeCoords.length > 1 && <FitRoute coords={routeCoords} />}

              {/* Blue route line */}
              {routeCoords.length > 0 && (
                <Polyline positions={routeCoords} color="#1d72e8" weight={4} opacity={0.85} />
              )}

              {/* Start dot */}
              {fromCoords && (
                <CircleMarker
                  center={[parseFloat(fromCoords.lat), parseFloat(fromCoords.lon)]}
                  radius={8}
                  pathOptions={{ color: '#fff', fillColor: '#1d72e8', fillOpacity: 1, weight: 2 }}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <b style={{ fontSize: 11 }}>From</b>
                  </Tooltip>
                </CircleMarker>
              )}

              {/* End dot */}
              {toCoords && (
                <CircleMarker
                  center={[parseFloat(toCoords.lat), parseFloat(toCoords.lon)]}
                  radius={8}
                  pathOptions={{ color: '#fff', fillColor: '#e83232', fillOpacity: 1, weight: 2 }}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <b style={{ fontSize: 11 }}>To</b>
                  </Tooltip>
                </CircleMarker>
              )}
            </MapContainer>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
