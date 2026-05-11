import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import Spinner from "../components/Spinner/Spinner.jsx";

const API_BASE = import.meta.env.VITE_APP_URL || "http://localhost:5000";

/* ─── helpers ────────────────────────────────────────────────── */

// "2026-05-09T11:30:00Z" → "1 hour ago" / "Yesterday" / "8 May"
function relativeLabel(iso) {
  if (!iso) return "—";
  const then = new Date(iso);
  if (isNaN(then.getTime())) return "";
  const diffMs = Date.now() - then.getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return m + " min ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " hour" + (h === 1 ? "" : "s") + " ago";
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7)  return d + " days ago";
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Group notifications into TODAY / YESTERDAY / EARLIER buckets — same
// visual structure as the original design but driven by real data.
function groupByDay(items) {
  const today = new Date();
  const todayKey = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  const groups = { TODAY: [], YESTERDAY: [], EARLIER: [] };
  for (const n of items) {
    const k = new Date(n.createdAt).toDateString();
    if (k === todayKey)         groups.TODAY.push(n);
    else if (k === yesterdayKey) groups.YESTERDAY.push(n);
    else                         groups.EARLIER.push(n);
  }
  return groups;
}

// Visual treatment per notification type
function visualForType(type) {
  switch (type) {
    case "payment":
      return { bg: "#D4EDDA", color: "#28A745", icon: "✓" };
    case "ride":
      return { bg: "#FFF3CD", color: "#F5A623", icon: "🚗" };
    case "warning":
      return { bg: "#FFE4E1", color: "#E67E22", icon: "⚠" };
    default:
      return { bg: "#E8F0FE", color: "#2563EB", icon: "ℹ" };
  }
}

/* ─── page ──────────────────────────────────────────────────── */

export default function NotificationsPage() {
  const navigate = useNavigate();
  const phone = (typeof window !== "undefined" && localStorage.getItem("phone")) || "";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      setError("You're not signed in. Please log in to see your notifications.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");

    axios
      .get(API_BASE + "/api/notifications", {
        params: { phone },
        timeout: 8000,
      })
      .then(({ data }) => {
        if (cancelled) return;
        setItems(Array.isArray(data?.data) ? data.data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.data?.message ||
          "Could not load notifications. Make sure the server is running."
        );
        console.error("[Notifications] fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [phone]);

  // Mark a single notification as read + run its action (if any)
  const handleAction = async (n) => {
    if (n.action?.to) navigate(n.action.to);
    if (!n.read) {
      try {
        await axios.patch(API_BASE + "/api/notifications/" + n._id + "/read");
        setItems((prev) =>
          prev.map((x) => (x._id === n._id ? { ...x, read: true } : x))
        );
      } catch {}
    }
  };

  const groups = groupByDay(items);
  const totalCount = items.length;

  return (
    <div className="notif-page" style={styles.page}>
      <Header />
      <div className="notif-container" style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Stay updated with your activity</h2>
          {totalCount > 0 && !loading && !error && (
            <div style={styles.headerSub}>
              {totalCount} {totalCount === 1 ? "notification" : "notifications"}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <Spinner label="Loading notifications…" sublabel="Fetching your latest updates" />
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            background: "#fff5f5", border: "1px solid #fecaca",
            color: "#dc2626", borderRadius: 12, padding: 16, textAlign: "center",
            margin: "12px 0",
          }}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && totalCount === 0 && (
          <div style={{
            background: "#fff", border: "1px dashed #cbd5e1",
            borderRadius: 14, padding: "44px 24px", textAlign: "center",
            color: "#475569",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1A1A2E", marginBottom: 6 }}>
              No notifications yet
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              Pay for a plan, post a ride, or unlock a contact — your activity will show up here.
            </div>
          </div>
        )}

        {/* Notification groups */}
        {!loading && !error && totalCount > 0 && Object.entries(groups).map(([group, list]) => (
          list.length === 0 ? null : (
            <div key={group} style={styles.group}>
              <p style={styles.groupLabel}>{group}</p>
              <div style={styles.cardList}>
                {list.map((n) => {
                  const v = visualForType(n.type);
                  return (
                    <div
                      key={n._id}
                      style={{
                        ...styles.card,
                        background: n.read ? "#FAFBFC" : "#FFFFFF",
                        opacity: n.read ? 0.85 : 1,
                      }}
                    >
                      {/* Type icon tile */}
                      <div
                        style={{
                          ...styles.iconWrap,
                          background: v.bg,
                          color: v.color,
                          fontWeight: 800,
                        }}
                      >
                        {n.type === "payment" ? (
                          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                            <circle cx="11" cy="11" r="11" fill="#28A745" />
                            <path d="M6 11.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : n.type === "warning" ? (
                          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                            <path d="M11 2.5L20.5 19H1.5L11 2.5z" fill="#E67E22" />
                            <text x="11" y="16" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">!</text>
                          </svg>
                        ) : n.type === "ride" ? (
                          <span style={{ fontSize: 20 }}>🚗</span>
                        ) : (
                          <span style={{ fontSize: 20 }}>{v.icon}</span>
                        )}
                      </div>

                      {/* Content */}
                      <div style={styles.cardContent}>
                        <div style={styles.cardTop}>
                          <span
                            style={{
                              ...styles.cardTitle,
                              color: n.type === "warning" ? "#E67E22" : "#1A1A2E",
                            }}
                          >
                            {n.title}
                            {!n.read && (
                              <span style={styles.unreadDot} title="Unread" />
                            )}
                          </span>
                          <span style={styles.cardTime}>{relativeLabel(n.createdAt)}</span>
                        </div>
                        {n.subtitle && (
                          <p style={styles.cardSubtitle}>{n.subtitle}</p>
                        )}
                        {n.action?.label && (
                          <div style={styles.actionRow}>
                            <button
                              type="button"
                              onClick={() => handleAction(n)}
                              style={styles.outlineBtn}
                            >
                              {n.action.label}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
      <Footer />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F4F6FB",
    fontFamily: "'Segoe UI', sans-serif",
    paddingBottom: 40,
    display: "flex",
    flexDirection: "column",
  },
  container: {
    flex: 1,
    maxWidth: 780,
    margin: "0 auto",
    padding: "0 16px",
    width: "100%",
    boxSizing: "border-box",
  },
  header: {
    textAlign: "center",
    padding: "28px 0 20px",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 500,
    color: "#1A1A2E",
    margin: 0,
    letterSpacing: "0.01em",
  },
  headerSub: {
    fontSize: 12,
    color: "#8A8FA8",
    marginTop: 4,
  },
  group: {
    marginBottom: 24,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#8A8FA8",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 0,
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  card: {
    background: "#FFFFFF",
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: "1.4",
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#3b82f6",
    display: "inline-block",
    flexShrink: 0,
  },
  cardTime: {
    fontSize: 12,
    color: "#A0A5B8",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    margin: "0 0 10px 0",
    lineHeight: "1.4",
  },
  actionRow: {
    marginTop: 6,
  },
  outlineBtn: {
    background: "transparent",
    border: "1.5px solid #2563EB",
    color: "#2563EB",
    borderRadius: 6,
    padding: "5px 14px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#F5A623",
    fontSize: 13,
    fontWeight: 500,
    padding: 0,
    cursor: "pointer",
    textDecoration: "underline",
  },
};
