import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import RideMap from "../components/RideMap/RideMap";
import {
  Search,
  Bell,
  User,
  MapPin,
  Calendar,
  Clock,
  BadgeCheck,
  Flame,
  Eye,
  ArrowRight,
  Car,
  Bike,
  Sun,
  Moon,
  PawPrint,
  Cigarette,
  UserRound,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

export default function FindFriend() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFrom = searchParams.get("from") || "";
  const queryTo   = searchParams.get("to")   || "";

  const [activeNav, setActiveNav] = useState("find");
  const [vehicle, setVehicle] = useState("bike");
  const [timeSlot, setTimeSlot] = useState("afternoon");
  const [femaleRider, setFemaleRider] = useState(true);
  const [pets, setPets] = useState(false);
  const [smoking, setSmoking] = useState(true);

  // Search bar inputs (live editing inside this page)
  const [fromInput, setFromInput] = useState(queryFrom);
  const [toInput,   setToInput]   = useState(queryTo);

  // Rides + UI
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false); // "Ride not available"

  // Fetch — uses /api/rides/search when from+to in URL, else /api/rides
  const fetchRides = async () => {
    try {
      setLoading(true);
      setError("");
      setNotFound(false);

      let url = `${API_BASE}/api/rides`;
      if (queryFrom && queryTo) {
        const qp = new URLSearchParams({ from: queryFrom, to: queryTo });
        url = `${API_BASE}/api/rides/search?${qp.toString()}`;
      }

      const { data } = await axios.get(url);
      setRides(data.data || []);

      // Backend returns { count: 0, message: "Ride not available", data: [] }
      if (queryFrom && queryTo && (!data.data || data.data.length === 0)) {
        setNotFound(true);
      }
    } catch (err) {
      setError("Could not load rides. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever the URL search params change + auto-refresh every 15s
  useEffect(() => {
    setFromInput(queryFrom);
    setToInput(queryTo);
    fetchRides();
    const interval = setInterval(fetchRides, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFrom, queryTo]);

  // Submit search bar at top → updates URL → triggers re-fetch
  const handleSearch = (e) => {
    e?.preventDefault?.();
    const f = fromInput.trim();
    const t = toInput.trim();
    if (!f || !t) {
      // empty → clear filter, show all
      setSearchParams({});
      return;
    }
    setSearchParams({ from: f, to: t });
  };

  const clearFilter = () => {
    setFromInput("");
    setToInput("");
    setSearchParams({});
  };

  return (
    <div className="tm-page">
      <style>{styles}</style>

      {/* ============== LEFT SIDEBAR ============== */}
      <aside className="tm-sidebar">
        <div className="tm-logo">TravelMate</div>

        <nav className="tm-nav">
          <button
            className={`tm-nav__item ${activeNav === "find" ? "tm-nav__item--active" : ""}`}
            onClick={() => setActiveNav("find")}
          >
            <Search size={18} strokeWidth={2.4} />
            <span>Find Friend</span>
          </button>

          <button
            className={`tm-nav__item ${activeNav === "notif" ? "tm-nav__item--active" : ""}`}
            onClick={() => setActiveNav("notif")}
          >
            <Bell size={18} strokeWidth={2} />
            <span>Notification</span>
          </button>

          <button
            className={`tm-nav__item ${activeNav === "profile" ? "tm-nav__item--active" : ""}`}
            onClick={() => setActiveNav("profile")}
          >
            <User size={18} strokeWidth={2} />
            <span>Profile</span>
          </button>
        </nav>

        <div className="tm-trust">
          <h4 className="tm-trust__title">Travel with trust</h4>
        </div>
      </aside>

      {/* ============== CENTER CONTENT ============== */}
      <main className="tm-main">
        {/* Search row */}
        <form className="tm-search" onSubmit={handleSearch}>
          <div className="tm-search__field">
            <MapPin size={16} className="tm-search__icon" />
            <input
              placeholder="From"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
            />
          </div>
          <div className="tm-search__field">
            <MapPin size={16} className="tm-search__icon" />
            <input
              placeholder="To"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
            />
          </div>
          <div className="tm-search__field">
            <Calendar size={16} className="tm-search__icon" />
            <input placeholder="Date (optional)" />
          </div>
          <button type="submit" className="tm-search__btn">Find Ride</button>
        </form>

        {/* Active filter chip + clear */}
        {(queryFrom || queryTo) && (
          <div className="tm-filterbar">
            <span className="tm-filterbar__label">
              Showing rides for:&nbsp;
              <strong>{queryFrom}</strong> → <strong>{queryTo}</strong>
            </span>
            <button type="button" className="tm-filterbar__clear" onClick={clearFilter}>
              Clear filter
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="tm-status">⏳ Loading rides...</div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="tm-status tm-status--error">⚠️ {error}</div>
        )}

        {/* "Ride not available" — search returned zero matches */}
        {!loading && !error && notFound && (
          <div className="tm-status tm-status--notfound">
            🚫 Ride not available for <strong>{queryFrom}</strong> → <strong>{queryTo}</strong>.
            <br />
            <a href="/post-ride" style={{ color: "#FFD93D", fontWeight: 600 }}>
              Be the first to post this ride →
            </a>
          </div>
        )}

        {/* Empty state — no rides at all (no filter active) */}
        {!loading && !error && !notFound && rides.length === 0 && (
          <div className="tm-status">
            No rides posted yet.{" "}
            <a href="/post-ride" style={{ color: "#FFD93D" }}>
              Post the first ride →
            </a>
          </div>
        )}

        {/* Ride cards — same format, now using live data */}
        <div className="tm-rides">
          {rides.map((ride) => (
            <article key={ride._id} className="tm-card"> {/* ✅ _id from MongoDB */}
              <div className="tm-card__left">
                <header className="tm-card__head">
                  <div className="tm-card__avatar">
                    {/* ✅ dynamic avatar initial from 'from' city */}
                    <div className="tm-card__avatar-initial">
                      {ride.from?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="tm-card__user">
                    <div className="tm-card__name-row">
                      {/* ✅ show "from city Rider" as name since we have no user profile yet */}
                      <span className="tm-card__name">{ride.from} Rider</span>
                      <BadgeCheck
                        size={16}
                        className="tm-card__verified"
                        fill="#FFD93D"
                        color="#0F0F2E"
                      />
                    </div>
                    {/* ✅ show gender from ride data */}
                    <div className="tm-card__meta">
                      {ride.gender} Rider
                    </div>
                  </div>
                </header>

                {/* ✅ live from → to */}
                <div className="tm-card__route">
                  {ride.from} <span className="tm-card__arrow">→</span> {ride.to}
                </div>

                {/* ✅ live date + time */}
                <div className="tm-card__time">
                  <Clock size={16} strokeWidth={2.2} />
                  <span>{ride.date} • {ride.time}</span>
                </div>

                {/* ✅ distance + duration as tags */}
                <div className="tm-card__tags">
                  <span className="tm-card__tag">📍 {ride.distance}</span>
                  <span className="tm-card__tag">⏱ {ride.duration}</span>
                  <span className="tm-card__tag">{ride.gender}</span>
                </div>

                <div className="tm-card__footer">
                  <div className="tm-card__footer-left">
                    <div className="tm-card__seats">
                      <Flame size={14} color="#FF8A3D" fill="#FF8A3D" />
                      <span>Available</span>
                    </div>
                    {/* ✅ show "NEW" if posted within last 10 mins */}
                    {Date.now() - new Date(ride.createdAt).getTime() < 10 * 60 * 1000 && (
                      <div className="tm-card__viewers">
                        <span style={{ color: "#4ade80", fontWeight: 600 }}>🟢 Just posted</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="tm-card__right">
                <div className="tm-card__map">
                  <RideMap ride={ride} />
                </div>
                <button
                  className="tm-card__connect"
                  onClick={() => navigate(`/connect-unlock?rideId=${ride._id}`)}
                >
                  Connect <ArrowRight size={16} strokeWidth={2.4} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* ============== RIGHT FILTERS PANEL ============== */}
      <aside className="tm-filters">
        {/* Vehicle */}
        <div className="tm-filter-row">
          <button
            className={`tm-chip ${vehicle === "car" ? "tm-chip--dark" : ""}`}
            onClick={() => setVehicle("car")}
          >
            <Car size={15} strokeWidth={2} />
            <span>Car</span>
          </button>
          <button
            className={`tm-chip ${vehicle === "bike" ? "tm-chip--dark" : ""}`}
            onClick={() => setVehicle("bike")}
          >
            <Bike size={15} strokeWidth={2} />
            <span>Bike</span>
          </button>
        </div>

        {/* Time slots */}
        <div className="tm-filter-row">
          <button
            className={`tm-chip ${timeSlot === "morning" ? "tm-chip--dark" : ""}`}
            onClick={() => setTimeSlot("morning")}
          >
            <Sun size={14} strokeWidth={2} />
            <span>Morning</span>
          </button>
          <button
            className={`tm-chip ${timeSlot === "afternoon" ? "tm-chip--dark" : ""}`}
            onClick={() => setTimeSlot("afternoon")}
          >
            <Sun size={14} strokeWidth={2} />
            <span>Afternoon</span>
          </button>
        </div>

        <div className="tm-filter-row">
          <button
            className={`tm-chip ${timeSlot === "evening" ? "tm-chip--dark" : ""}`}
            onClick={() => setTimeSlot("evening")}
          >
            <Sun size={14} strokeWidth={2} />
            <span>Evening</span>
          </button>
          <button
            className={`tm-chip ${timeSlot === "night" ? "tm-chip--dark" : ""}`}
            onClick={() => setTimeSlot("night")}
          >
            <Moon size={13} strokeWidth={2} />
            <span>Night</span>
          </button>
        </div>

        {/* Female Rider */}
        <div className="tm-filter-row">
          <button
            className={`tm-chip tm-chip--full ${femaleRider ? "tm-chip--dark" : ""}`}
            onClick={() => setFemaleRider(!femaleRider)}
          >
            <UserRound size={14} strokeWidth={2} />
            <span>Female Rider</span>
          </button>
        </div>

        {/* Pets / Smoking */}
        <div className="tm-filter-row">
          <button
            className={`tm-chip ${pets ? "tm-chip--dark" : ""}`}
            onClick={() => setPets(!pets)}
          >
            <PawPrint size={14} strokeWidth={2} />
            <span>Pets</span>
          </button>
          <button
            className={`tm-chip tm-chip--wide ${smoking ? "tm-chip--dark" : ""}`}
            onClick={() => setSmoking(!smoking)}
          >
            <Cigarette size={14} strokeWidth={2} />
            <span>Smoking Allowed</span>
          </button>
        </div>

        <div className="tm-filters__divider" />

        {/* Reset / Apply */}
        <div className="tm-filters__actions">
          <button className="tm-filters__reset">Reset</button>
          <button className="tm-filters__apply">Apply Filters (4)</button>
        </div>
      </aside>
    </div>
  );
}

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .tm-page {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    min-height: 100vh;
    background: linear-gradient(180deg, #E8E8EC 0%, #EFEFF2 100%);
    display: grid;
    grid-template-columns: 260px 1fr 300px;
    gap: 24px;
    padding: 28px 32px;
    color: #1a1a1a;
  }

  /* ============ SIDEBAR ============ */
  .tm-sidebar {
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding-top: 8px;
  }

  .tm-logo {
    font-size: 30px;
    font-weight: 800;
    color: #C724B1;
    letter-spacing: -0.5px;
    font-family: 'Inter', sans-serif;
  }

  .tm-nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tm-nav__item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    background: transparent;
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    color: #1a1a1a;
    text-align: left;
    transition: background 0.18s ease;
  }
  .tm-nav__item:hover { background: rgba(255, 217, 61, 0.18); }
  .tm-nav__item--active {
    background: #FFD93D;
    font-weight: 600;
    box-shadow: 0 1px 0 rgba(0,0,0,0.04);
  }

  .tm-trust {
    margin-top: auto;
    background: #DEDDE3;
    border-radius: 16px;
    padding: 18px 20px;
    margin-bottom: 8px;
  }
  .tm-trust__title {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
  }

  /* ============ MAIN ============ */
  .tm-main {
    display: flex;
    flex-direction: column;
    gap: 22px;
    min-width: 0;
  }

  /* search bar */
  .tm-search {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 10px;
    background: #FFFFFF;
    padding: 10px;
    border-radius: 18px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }

  .tm-search__field {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #F4F4F6;
    padding: 12px 14px;
    border-radius: 12px;
  }
  .tm-search__icon { color: #6B6B72; flex-shrink: 0; }
  .tm-search__field input {
    border: none;
    outline: none;
    background: transparent;
    font-size: 14px;
    color: #1a1a1a;
    width: 100%;
    font-family: inherit;
  }
  .tm-search__field input::placeholder { color: #8a8a92; }

  .tm-search__btn {
    background: #FFD93D;
    border: none;
    border-radius: 12px;
    padding: 0 26px;
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .tm-search__btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(255, 217, 61, 0.35);
  }

  /* ============ STATUS MESSAGES ============ */
  .tm-status {
    text-align: center;
    color: #6B6B72;
    padding: 40px 0;
    font-size: 15px;
  }
  .tm-status--error {
    background: #fff0f0;
    border: 1px solid #fecaca;
    border-radius: 12px;
    color: #dc2626;
    padding: 16px;
  }
  .tm-status--notfound {
    background: #fff7ed;
    border: 1px solid #fed7aa;
    color: #9a3412;
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    line-height: 1.7;
  }

  /* Active-filter chip bar */
  .tm-filterbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #FFFFFF;
    padding: 12px 16px;
    border-radius: 14px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    border: 1px solid #ECECEF;
  }
  .tm-filterbar__label {
    font-size: 13px;
    color: #475569;
  }
  .tm-filterbar__clear {
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .tm-filterbar__clear:hover {
    border-color: #C724B1;
    color: #C724B1;
  }

  /* ============ RIDE CARDS ============ */
  .tm-rides {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .tm-card {
    background: #0F0F2E;
    border-radius: 22px;
    padding: 22px;
    display: grid;
    grid-template-columns: 1fr 220px;
    gap: 20px;
    color: #fff;
    box-shadow: 0 4px 24px rgba(15,15,46,0.08);
  }

  .tm-card__left {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .tm-card__head {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .tm-card__avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ✅ avatar initial letter */
  .tm-card__avatar-initial {
    color: #fff;
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
  }

  .tm-card__user { display: flex; flex-direction: column; gap: 2px; }
  .tm-card__name-row { display: flex; align-items: center; gap: 6px; }
  .tm-card__name {
    font-size: 17px;
    font-weight: 600;
    color: #fff;
  }
  .tm-card__meta {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
  }

  .tm-card__route {
    font-size: 18px;
    font-weight: 500;
    color: #fff;
  }
  .tm-card__arrow { color: rgba(255,255,255,0.7); margin: 0 4px; }

  .tm-card__time {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #FFD93D;
    font-size: 14px;
    font-weight: 600;
  }

  .tm-card__tags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .tm-card__tag {
    background: rgba(255,255,255,0.07);
    padding: 7px 14px;
    border-radius: 20px;
    font-size: 12px;
    color: rgba(255,255,255,0.85);
    font-weight: 500;
  }

  .tm-card__footer {
    margin-top: 4px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .tm-card__footer-left { display: flex; flex-direction: column; gap: 6px; }

  .tm-card__seats {
    background: rgba(255, 138, 61, 0.12);
    color: #FF8A3D;
    padding: 6px 12px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    width: fit-content;
  }
  .tm-card__viewers {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255,255,255,0.45);
    font-size: 11px;
    margin-left: 4px;
  }

  /* card right side */
  .tm-card__right {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .tm-card__map {
    flex: 1;
    background: #1a1a3e;
    border-radius: 14px;
    overflow: hidden;
    min-height: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tm-card__map-svg { width: 100%; height: 100%; }

  .tm-card__connect {
    background: #FFD93D;
    border: none;
    border-radius: 14px;
    padding: 14px 20px;
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .tm-card__connect:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(255,217,61,0.35);
  }

  /* ============ FILTERS PANEL ============ */
  .tm-filters {
    background: #FFFFFF;
    border-radius: 22px;
    padding: 22px 20px;
    height: fit-content;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  }

  .tm-filter-row { display: flex; gap: 8px; }

  .tm-chip {
    flex: 1;
    background: #E5E5EA;
    color: #1a1a1a;
    border: none;
    border-radius: 22px;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: inherit;
    transition: all 0.18s ease;
    white-space: nowrap;
  }
  .tm-chip:hover { background: #DCDCE0; }
  .tm-chip--dark { background: #0F0F2E; color: #fff; }
  .tm-chip--dark:hover { background: #1a1a3e; }
  .tm-chip--full { flex: 1; }
  .tm-chip--wide { flex: 1.6; }

  .tm-filters__divider {
    height: 1px;
    background: #ECECEF;
    margin: 6px 0 4px;
  }

  .tm-filters__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .tm-filters__reset {
    background: transparent;
    border: none;
    font-size: 14px;
    color: #8a8a92;
    cursor: pointer;
    font-family: inherit;
  }
  .tm-filters__reset:hover { color: #1a1a1a; }

  .tm-filters__apply {
    background: #FFD93D;
    border: none;
    border-radius: 12px;
    padding: 11px 18px;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    cursor: pointer;
    font-family: inherit;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .tm-filters__apply:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(255,217,61,0.35);
  }

  /* ============ RESPONSIVE ============ */
  @media (max-width: 1100px) {
    .tm-page { grid-template-columns: 220px 1fr; padding: 20px; }
    .tm-filters { grid-column: 1 / -1; }
  }

  @media (max-width: 760px) {
    .tm-page { grid-template-columns: 1fr; padding: 16px; gap: 16px; }
    .tm-search { grid-template-columns: 1fr 1fr; }
    .tm-search__btn { grid-column: 1 / -1; padding: 12px; }
    .tm-card { grid-template-columns: 1fr; }
    .tm-card__right { flex-direction: row; }
    .tm-card__map { min-height: 100px; }
  }
`;
