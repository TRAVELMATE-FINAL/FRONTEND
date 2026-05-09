import { useState } from "react";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const notifications = {
  TODAY: [
    {
      id: 1,
      type: "ride",
      icon: "🚗",
      iconBg: "#FFF3CD",
      iconColor: "#F5A623",
      title: "New ride available for your route",
      subtitle: "Chennai → Madurai",
      subtitleIcon: "🚌",
      time: "1 hour ago",
      action: { label: "View Ride", variant: "outline" },
      read: false,
    },
  ],
  YESTERDAY: [
    {
      id: 2,
      type: "success",
      icon: "✓",
      iconBg: "#D4EDDA",
      iconColor: "#28A745",
      title: "Payment successful 🎉",
      subtitle: "Contact unlocked for your trip to Bangalore.",
      time: "Yesterday",
      read: false,
    },
    {
      id: 3,
      type: "warning",
      icon: "⚠",
      iconBg: "#FFF3CD",
      iconColor: "#E67E22",
      title: "Ride cancelled by driver",
      subtitle: "The ride scheduled for 6:00 PM was cancelled.",
      time: "Yesterday",
      action: { label: "Find another ride", variant: "link" },
      read: false,
      titleColor: "#E67E22",
    },
  ],
};

export default function NotificationsPage() {
  const [items, setItems] = useState(notifications);

  return (
    <div className="notif-page" style={styles.page}>
      <Header />
      <div className="notif-container" style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Stay updated with your activity</h2>
        </div>

        {/* Notification Groups */}
        {Object.entries(items).map(([group, notifs]) => (
          <div key={group} style={styles.group}>
            <p style={styles.groupLabel}>{group}</p>
            <div style={styles.cardList}>
              {notifs.map((n) => (
                <div key={n.id} style={styles.card}>
                  {/* Icon */}
                  <div
                    style={{
                      ...styles.iconWrap,
                      background: n.iconBg,
                      color: n.iconColor,
                    }}
                  >
                    {n.type === "success" ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="10" fill="#28A745" />
                        <path
                          d="M5.5 10.5L8.5 13.5L14.5 7"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : n.type === "warning" ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M10 2L18.66 17H1.34L10 2Z"
                          fill="#E67E22"
                          stroke="#E67E22"
                          strokeWidth="1"
                        />
                        <text
                          x="10"
                          y="15"
                          textAnchor="middle"
                          fill="white"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          !
                        </text>
                      </svg>
                    ) : (
                      <span style={styles.rideIcon}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                          <rect width="24" height="24" rx="6" fill="#FFF3CD" />
                          <path
                            d="M5 15H19M7 18V19M17 18V19M6 12L8 8H16L18 12H6Z"
                            stroke="#F5A623"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle cx="8.5" cy="14.5" r="1" fill="#F5A623" />
                          <circle cx="15.5" cy="14.5" r="1" fill="#F5A623" />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={styles.cardContent}>
                    <div style={styles.cardTop}>
                      <span
                        style={{
                          ...styles.cardTitle,
                          color: n.titleColor || "#1A1A2E",
                        }}
                      >
                        {n.title}
                      </span>
                      <span style={styles.cardTime}>{n.time}</span>
                    </div>
                    {n.subtitleIcon ? (
                      <div style={styles.routeRow}>
                        <span style={styles.routeIcon}>🚌</span>
                        <span style={styles.cardSubtitle}>{n.subtitle}</span>
                      </div>
                    ) : (
                      <p style={styles.cardSubtitle}>{n.subtitle}</p>
                    )}
                    {n.action && (
                      <div style={styles.actionRow}>
                        {n.action.variant === "outline" ? (
                          <button style={styles.outlineBtn}>{n.action.label}</button>
                        ) : (
                          <button style={styles.linkBtn}>{n.action.label}</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
  },
  container: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "0 16px",
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
  rideIcon: {
    display: "flex",
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
  },
  cardTime: {
    fontSize: 12,
    color: "#A0A5B8",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  routeRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  routeIcon: {
    fontSize: 13,
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
