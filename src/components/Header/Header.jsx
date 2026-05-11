import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Header.css';

const API_BASE = import.meta.env.VITE_APP_URL || 'http://localhost:5000';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll the notifications endpoint every 30s + refetch on route change
  // so the bell-icon dot reflects new unread notifications without
  // requiring a page refresh.
  useEffect(() => {
    const phone =
      (typeof window !== 'undefined' && localStorage.getItem('phone')) || '';
    if (!phone) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    const fetchUnread = () => {
      axios
        .get(API_BASE + '/api/notifications', {
          params: { phone },
          timeout: 6000,
        })
        .then(({ data }) => {
          if (cancelled) return;
          const items = Array.isArray(data?.data) ? data.data : [];
          setUnreadCount(items.filter((n) => !n.read).length);
        })
        .catch(() => {
          // Silent — header shouldn't bother the user if the API is down
        });
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location.pathname]);

  return (
    <div className="tm-navbar">
      {/* Brand (click → home) — uses the user-supplied favicon.png as
          the logo icon, paired with the gradient wordmark. */}
      <div className="tm-navbar__brand" onClick={() => navigate('/')}>
        <img
          className="tm-navbar__logo-img"
          src="/favicon.png"
          alt="Travel Mate"
          width="38"
          height="38"
        />
        <span className="tm-navbar__name">Travel Mate</span>
      </div>

      {/* Right cluster — bell, settings, login */}
      <div className="tm-navbar__actions">
        <button
          type="button"
          className="tm-navbar__icon-btn tm-navbar__bell"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
          onClick={() => navigate('/notifications')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="tm-navbar__bell-dot" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className="tm-navbar__icon-btn"
          aria-label="Profile settings"
          onClick={() => navigate('/profile-settings')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <button type="button" className="tm-navbar__login" onClick={() => navigate('/login')}>
          Login
        </button>
      </div>
    </div>
  );
}

export default Header;
