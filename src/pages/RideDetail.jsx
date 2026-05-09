export default function RideDetail() {
  return (
    <div
      className="ride-detail-page"
      style={{
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        background: "#f0f2f8",
        minHeight: "100vh",
      }}
    >
      {/* ── Navbar ── */}
      <nav
        className="ride-detail-nav"
        style={{
          background: "#1a1a2e",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo icon */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#a855f7,#7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 17l4-8 5 4 4-6 5 10"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "-0.3px",
            }}
          >
            Travel Mate
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Bell */}
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ccc",
              padding: 4,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                stroke="#ccc"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {/* Settings */}
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ccc",
              padding: 4,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="#ccc" strokeWidth="1.8" />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="#ccc"
                strokeWidth="1.8"
              />
            </svg>
          </button>
          {/* Login */}
          <button
            style={{
              background: "#f5c518",
              color: "#111",
              border: "none",
              borderRadius: 8,
              padding: "9px 22px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </div>
      </nav>

      {/* ── Page body ── */}
      <div
        className="ride-detail-grid"
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "32px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Driver card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px 24px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid #e8eaf0",
                }}
              >
                <img
                  src="https://randomuser.me/api/portraits/men/32.jpg"
                  alt="Alex Rivera"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              {/* Online dot */}
              <div
                style={{
                  position: "absolute",
                  bottom: 4,
                  right: 4,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#22c55e",
                  border: "2px solid #fff",
                }}
              />
            </div>

            {/* Name & email */}
            <div style={{ flex: 1 }}>
              <div
                style={{ fontWeight: 700, fontSize: 20, color: "#111", marginBottom: 3 }}
              >
                Alex Rivera
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>alex@gmail.com</div>
            </div>

            {/* Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#f0f4ff",
                  color: "#4f6ef7",
                  borderRadius: 20,
                  padding: "6px 13px",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                    stroke="#4f6ef7"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                    stroke="#4f6ef7"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Swift
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#fffbea",
                  color: "#b45309",
                  borderRadius: 20,
                  padding: "6px 13px",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ★ 4.8(43)
              </span>
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#999",
                  padding: 4,
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                ⋮
              </button>
            </div>
          </div>

          {/* Vehicle Details */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px 24px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 20,
                color: "#111",
                marginBottom: 22,
              }}
            >
              Vehicle Details
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 32px",
              }}
            >
              {/* Row 1 */}
              <div style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 5, fontWeight: 500 }}>
                  Vehicle
                </div>
                <div style={{ fontSize: 15, color: "#111", fontWeight: 500 }}>Swift</div>
              </div>
              <div style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 5, fontWeight: 500 }}>
                  Color
                </div>
                <div style={{ fontSize: 15, color: "#111", fontWeight: 500 }}>White</div>
              </div>

              {/* Row 2 */}
              <div>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 5, fontWeight: 500 }}>
                  Plate Number
                </div>
                <div style={{ fontSize: 15, color: "#111", fontWeight: 500 }}>TN 01 AB 1234</div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 5, fontWeight: 500 }}>
                  Type
                </div>
                <div style={{ fontSize: 15, color: "#111", fontWeight: 500 }}>Car</div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px 24px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: "#111",
                marginBottom: 12,
              }}
            >
              Additional Information
            </div>
            <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>
              AC car. No smoking. Pet-friendly. Will stop for breaks.
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Date / Seats card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "20px 20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                color: "#555",
                fontSize: 14,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="#555" strokeWidth="1.7" />
                <path d="M16 2v4M8 2v4M3 10h18" stroke="#555" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              Today, 3:00 PM
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#555",
                fontSize: 14,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="7" r="3" stroke="#555" strokeWidth="1.6" />
                <circle cx="17" cy="7" r="2.5" stroke="#555" strokeWidth="1.4" />
                <path d="M3 20c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#555" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M17 14c1.66 0 3 1.34 3 3v1" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              2 seats available
            </div>

            {/* Contact box */}
            <div
              style={{
                background: "#f7f8fc",
                border: "1px solid #e8eaf0",
                borderRadius: 10,
                padding: "14px 16px",
                marginTop: 18,
              }}
            >
              <div style={{ fontSize: 13, color: "#777", marginBottom: 6, fontWeight: 500 }}>
                Contact Number
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#111", letterSpacing: "0.5px" }}>
                9876543210
              </div>
            </div>

            {/* Warning */}
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "12px 16px",
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="1.8" />
                <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
                Only 2 seats left!
              </span>
            </div>
          </div>

          {/* Ride Route card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "20px 20px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#111",
                marginBottom: 18,
              }}
            >
              Ride Route
            </div>

            {/* Route stops */}
            <div style={{ display: "flex", gap: 14 }}>
              {/* Timeline */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 4,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#3b82f6",
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    background: "#e0e0e0",
                    margin: "4px 0",
                    minHeight: 40,
                    borderRadius: 1,
                    borderStyle: "dashed",
                    borderColor: "#ccc",
                    borderWidth: "0 0 0 2px",
                    width: 0,
                    borderLeft: "2px dashed #ccc",
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#22c55e",
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Labels */}
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 3 }}>
                    Chennai
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>T Nager, Chennai</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 3 }}>
                    Madurai
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>Periyar Bus Stand, Madurai</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
