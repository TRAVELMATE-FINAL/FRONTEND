import { useNavigate } from "react-router-dom";

export default function FindRide() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        html, body, #root { margin: 0; padding: 0; height: 100%; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={s.page}>
        {/* background watermark */}
        <div style={s.bgText} aria-hidden="true">TravelMate</div>

        <div style={s.card}>
          {/* header */}
          <div style={s.headerIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>

          <h2 style={s.title}>Find a Ride</h2>
          <p style={s.subtitle}>Profile setup complete! 🎉 Start exploring rides near you.</p>

          {/* search fields */}
          <div style={s.fieldGroup}>
            <label style={s.label}>From</label>
            <div style={s.inputWrap}>
              <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="#b0b8c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <input type="text" placeholder="Enter pickup location" style={s.input} />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>To</label>
            <div style={s.inputWrap}>
              <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="#b0b8c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <input type="text" placeholder="Enter destination" style={s.input} />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Date</label>
            <div style={s.inputWrap}>
              <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="#b0b8c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                style={{ ...s.input, colorScheme: "light" }}
              />
            </div>
          </div>

          {/* search button */}
          <button style={s.searchBtn}>
            🔍 Search Rides
          </button>

          {/* divider */}
          <div style={s.divider}>
            <span style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <span style={s.dividerLine} />
          </div>

          {/* offer a ride */}
          <button style={s.offerBtn}>
            🚗 Offer a Ride
          </button>
        </div>

        <p style={s.bottomHint}>🌍 Connecting travellers across India</p>
      </div>
    </>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#e8eaf6",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },
  bgText: {
    position: "absolute",
    fontSize: "clamp(80px, 18vw, 200px)",
    fontWeight: 900,
    color: "rgba(155,133,210,0.2)",
    letterSpacing: "-4px",
    userSelect: "none",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 0,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "36px 40px",
    width: "100%",
    maxWidth: 480,
    position: "relative",
    zIndex: 1,
    boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#0e2454",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    color: "#0b1d3a",
    margin: "0 0 6px",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 13,
    color: "#6b7280",
    margin: "0 0 24px",
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: 7,
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1.5px solid #e5e7eb",
    borderRadius: 9,
    background: "#fff",
    padding: "0 14px",
  },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 13,
    color: "#111827",
    background: "transparent",
    padding: "11px 0",
    width: "100%",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },
  searchBtn: {
    display: "block",
    width: "100%",
    padding: "14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 8,
    letterSpacing: "0.1px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "20px 0",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#e5e7eb",
  },
  dividerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  offerBtn: {
    display: "block",
    width: "100%",
    padding: "13px",
    background: "#fff",
    color: "#2563eb",
    border: "1.5px solid #2563eb",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.1px",
  },
  bottomHint: {
    marginTop: 20,
    fontSize: 13,
    color: "#6b7280",
    position: "relative",
    zIndex: 1,
    textAlign: "center",
  },
};