import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#1a73e8" opacity="0.12" />
    <path d="M6 10.5l3 3 5-5.5" stroke="#1a73e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ImagePlaceholder = ({ index }) => {
  const colors = ["#b0c4de", "#87afd4", "#c8dae8"];
  return (
    <div
      style={{
        width: index === 1 ? 120 : 80,
        height: index === 1 ? 160 : 140,
        background: colors[index],
        borderRadius: index === 1 ? "12px" : "8px",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        alignSelf: index === 1 ? "flex-start" : "center",
      }}
    >
      {index === 1 && (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(160deg, #4a8fc1 0%, #2e6ea6 40%, #1d5a8e 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <ellipse cx="24" cy="36" rx="20" ry="6" fill="#1a4f7a" opacity="0.4" />
            <path d="M8 30 Q12 18 24 16 Q36 18 40 30" fill="#2e8b57" opacity="0.6" />
            <circle cx="24" cy="14" r="10" fill="#87ceeb" opacity="0.5" />
            <path d="M14 26 Q20 20 24 22 Q28 20 34 26" fill="#228b22" opacity="0.7" />
          </svg>
        </div>
      )}
      {index !== 1 && (
        <div
          style={{
            width: "100%",
            height: "100%",
            background:
              index === 0
                ? "linear-gradient(135deg, #c8dae8 0%, #a8c4d8 100%)"
                : "linear-gradient(135deg, #d8e8f0 0%, #b8d0e0 100%)",
          }}
        />
      )}
    </div>
  );
};

const DotIndicator = ({ active }) => (
  <div
    style={{
      width: active ? 22 : 8,
      height: 8,
      borderRadius: 4,
      background: active ? "#1a73e8" : "#c0cdd8",
      transition: "width 0.3s ease",
    }}
  />
);

export default function TravelMatePlanPage() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(1);

  // "Go Daily" → save the plan choice and ALWAYS navigate to the
  // Unlock Contact page. The login / OTP / profile-setup gating
  // happens inside UnlockContact's "Pay Now" handler — so the user
  // gets to see the page first, then auths if they're not signed in.
  const goDaily = () => {
    try { localStorage.setItem("chosenPlan", "daily"); } catch (e) {}
    console.log("[Findrideplan] Go Daily clicked → /unlock-contact");
    navigate("/unlock-contact");
  };

  return (
    <div
      className="plan-page"
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <Header />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
        }}
      >
        <div className="frp-shell" style={{ width: "100%", maxWidth: 920 }}>
          {/* Heading */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 12px",
                letterSpacing: "-0.5px",
              }}
            >
              Choose your plan
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "#6b7280",
                lineHeight: 1.6,
                margin: 0,
                maxWidth: 520,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Elevate your social experience with premium networking tools and exclusive insights tailored for modern creators.
            </p>
          </div>

          {/* Daily Plan Card */}
          <div
            className="frp-plan-row"
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 16,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              flexWrap: "wrap",
            }}
          >
            {/* Plan Info */}
            <div style={{ flex: "1 1 140px", minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#111827", margin: "0 0 2px" }}>
                Daily Plan
              </p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Short-term Access</p>
            </div>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 2, flexShrink: 0 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-1px" }}>
                ₹30
              </span>
              <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: 2 }}>/24h</span>
            </div>

            {/* Feature */}
            <div
              className="frp-feature"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flex: "1 1 200px",
                maxWidth: 240,
                minWidth: 0,
              }}
            >
              <CheckIcon />
              <span style={{ fontSize: 12.5, color: "#4b5563", lineHeight: 1.4 }}>
                Unlimited Ride For Only This Route For 24 Hours
              </span>
            </div>

            {/* CTA — Go Daily → /unlock-contact */}
            <button
              type="button"
              onClick={goDaily}
              style={{
                background: "transparent",
                border: "1.5px solid #d1d5db",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontFamily: "inherit",
                transition: "border-color 0.2s, background 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#1a73e8";
                e.currentTarget.style.color = "#1a73e8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.color = "#111827";
              }}
            >
              Go Daily
            </button>
          </div>

          {/* Special Offer Card */}
          <div
            className="frp-promo"
            style={{
              background: "#111827",
              borderRadius: 20,
              padding: 28,
              display: "flex",
              gap: 24,
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
              flexWrap: "wrap",
            }}
          >
            {/* Image collage */}
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "flex-end",
                flexShrink: 0,
              }}
            >
              <ImagePlaceholder index={0} />
              <ImagePlaceholder index={1} />
              <ImagePlaceholder index={2} />
            </div>

            {/* Content */}
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  margin: "0 0 8px",
                }}
              >
                SPECIAL OFFER
              </p>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#ffffff",
                  margin: "0 0 10px",
                  lineHeight: 1.25,
                  letterSpacing: "-0.3px",
                }}
              >
                Get 20% off on your next trip
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  lineHeight: 1.6,
                  margin: "0 0 20px",
                }}
              >
                Book your summer getaway through our partner portal and enjoy exclusive savings only for LuxeTier users.
              </p>
              <button
                type="button"
                style={{
                  background: "#22c55e",
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 22px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.2s, transform 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#16a34a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#22c55e")}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                Claim Discount
              </button>
            </div>
          </div>

          {/* Slide indicators */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 6,
              marginTop: 18,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} onClick={() => setActiveSlide(i)} style={{ cursor: "pointer" }}>
                <DotIndicator active={activeSlide === i} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />

      {/* Inline responsive rules — keeps the wide horizontal row layout
          on desktop while gracefully stacking on phones. */}
      <style>{`
        @media (max-width: 760px) {
          .frp-shell { max-width: 100% !important; padding: 0 4px; }
          .frp-plan-row { padding: 16px 18px !important; gap: 12px !important; }
          .frp-feature { flex: 1 1 100% !important; max-width: 100% !important; order: 4; }
          .frp-promo { padding: 22px !important; gap: 18px !important; }
          .frp-promo h2 { font-size: 19px !important; }
          .plan-page h1 { font-size: 28px !important; }
        }
        @media (max-width: 480px) {
          .frp-plan-row { padding: 14px 16px !important; }
          .frp-plan-row > div:first-child { flex: 1 1 100% !important; }
          .frp-plan-row > div:nth-child(2) { flex: 0 0 auto !important; order: 3; }
          .frp-plan-row > button { flex: 1 1 100% !important; order: 5; }
          .plan-page h1 { font-size: 24px !important; }
        }
      `}</style>
    </div>
  );
}
