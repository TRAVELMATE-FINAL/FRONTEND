import { useState, useLayoutEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const Check = ({ color = "#22c55e", bg = "#e8f5e9" }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="9" cy="9" r="9" fill={bg} />
    <path d="M5.5 9l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BeachSVG = () => (
  <svg viewBox="0 0 110 138" width="110" height="138" xmlns="http://www.w3.org/2000/svg">
    <rect width="110" height="84" fill="#87ceeb"/>
    <circle cx="82" cy="22" r="12" fill="#ffe066"/>
    <ellipse cx="26" cy="22" rx="17" ry="8" fill="#fff" opacity=".8"/>
    <ellipse cx="42" cy="18" rx="12" ry="7" fill="#fff" opacity=".8"/>
    <rect y="70" width="110" height="42" fill="#1e90c8"/>
    <path d="M0 77 Q14 72 28 77 Q42 82 56 77 Q70 72 84 77 Q98 82 110 77" stroke="#fff" strokeWidth="1.4" fill="none" opacity=".5"/>
    <path d="M0 87 Q18 82 36 87 Q54 92 72 87 Q90 82 110 87" stroke="#fff" strokeWidth="1.1" fill="none" opacity=".4"/>
    <ellipse cx="55" cy="112" rx="72" ry="26" fill="#f5dea3"/>
    <ellipse cx="36" cy="118" rx="10" ry="4" fill="#e8c97a" opacity=".5"/>
    <ellipse cx="75" cy="115" rx="8" ry="3" fill="#e8c97a" opacity=".5"/>
    <path d="M24 110 Q29 87 34 66" stroke="#7a5c2e" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    <path d="M34 66 Q12 53 5 41" stroke="#3a8c3a" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M34 66 Q27 48 34 34" stroke="#3a8c3a" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M34 66 Q46 51 56 41" stroke="#3a8c3a" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M34 66 Q42 60 54 60" stroke="#3a8c3a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <circle cx="31" cy="69" r="3.5" fill="#b5651d"/>
    <circle cx="36" cy="73" r="3" fill="#b5651d"/>
    <line x1="82" y1="110" x2="82" y2="82" stroke="#c0392b" strokeWidth="2.5"/>
    <path d="M62 82 Q82 70 102 82 Z" fill="#e74c3c"/>
    <rect x="68" y="106" width="26" height="8" rx="2.5" fill="#f39c12" opacity=".9"/>
    <line x1="73" y1="106" x2="73" y2="114" stroke="#e67e22" strokeWidth="1"/>
    <line x1="78" y1="106" x2="78" y2="114" stroke="#e67e22" strokeWidth="1"/>
    <line x1="83" y1="106" x2="83" y2="114" stroke="#e67e22" strokeWidth="1"/>
    <line x1="88" y1="106" x2="88" y2="114" stroke="#e67e22" strokeWidth="1"/>
    <path d="M65 80 L72 74 L79 80 Z" fill="#fff" opacity=".7"/>
    <line x1="0" y1="70" x2="110" y2="70" stroke="#1a7ab8" strokeWidth="0.6" opacity=".4"/>
  </svg>
);

export default function PlanPage() {
  const navigate = useNavigate();

  // Always start at the very top when arriving from Publish Ride
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const choosePlan = (planKey) => {
    console.log("[PlanPage] choosePlan:", planKey);
    try { localStorage.setItem("chosenPlan", planKey); } catch (e) {}
    navigate("/securepayment");
  };

  const s = {
    page: {
      fontFamily: "'Poppins', sans-serif",
      background: "#f5f5f7",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      padding: "48px 20px 28px",
    },
    inner: { width: "100%", maxWidth: 900 },
    heading: { textAlign: "center", marginBottom: 40 },
    h1: { fontSize: 36, fontWeight: 700, color: "#111", marginBottom: 10, margin: 0 },
    sub: { fontSize: 14, color: "#888", lineHeight: 1.7, maxWidth: 520, margin: "10px auto 0" },
    plansRow: { display: "flex", justifyContent: "center", alignItems: "stretch", marginBottom: 32 },
    card: {
      background: "#fff", borderRadius: 18, padding: "32px 28px 28px",
      flex: 1, position: "relative", border: "1.5px solid #ebebeb", minWidth: 0,
    },
    cardFeatured: {
      background: "#fff", borderRadius: 22, padding: "38px 32px 32px",
      flex: 1, position: "relative", border: "2.5px solid #a78bfa",
      zIndex: 2, margin: "-12px -10px",
      boxShadow: "0 10px 40px rgba(120,80,255,0.13)", minWidth: 0,
    },
    mostPopular: {
      position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)",
      background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700,
      padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.6px",
    },
    bestValue: {
      position: "absolute", top: 0, right: 0,
      background: "#0ea5e9", color: "#fff", fontSize: 10, fontWeight: 700,
      padding: "7px 13px", borderRadius: "0 16px 0 16px", letterSpacing: "0.5px",
    },
    planName: { fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 4 },
    planNameMonthly: { fontSize: 20, fontWeight: 700, color: "#7c3aed", marginBottom: 4 },
    planSub: { fontSize: 13, color: "#aaa", marginBottom: 22 },
    priceRow: { marginBottom: 22, display: "flex", alignItems: "flex-end", gap: 2 },
    symbol: { fontSize: 26, fontWeight: 700, color: "#111", lineHeight: 1.6 },
    symbolPurple: { fontSize: 26, fontWeight: 700, color: "#7c3aed", lineHeight: 1.6 },
    amount: { fontSize: 52, fontWeight: 800, color: "#111", lineHeight: 1 },
    amountPurple: { fontSize: 52, fontWeight: 800, color: "#7c3aed", lineHeight: 1 },
    per: { fontSize: 14, color: "#aaa", marginBottom: 7, marginLeft: 2 },
    feature: { display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 24 },
    btnOutline: {
      width: "100%", borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 600,
      fontFamily: "'Poppins',sans-serif", cursor: "pointer",
      background: "#fff", border: "1.5px solid #d0d0d0", color: "#333",
    },
    btnFilled: {
      width: "100%", borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 600,
      fontFamily: "'Poppins',sans-serif", cursor: "pointer",
      background: "#7c3aed", border: "none", color: "#fff",
    },
    promo: {
      background: "#1a1f36", borderRadius: 22, padding: "32px 32px",
      display: "flex", alignItems: "center", gap: 28, overflow: "hidden",
    },
    promoImages: { display: "flex", gap: 10, flexShrink: 0, alignItems: "center" },
    promoImgSide: { width: 90, height: 120, borderRadius: 14, background: "#2a3050", opacity: 0.4, flexShrink: 0 },
    promoImgMid: { width: 110, height: 138, borderRadius: 14, overflow: "hidden", flexShrink: 0 },
    promoContent: { flex: 1 },
    promoLabel: { fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "1.2px", marginBottom: 8 },
    promoTitle: { fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 10, lineHeight: 1.3 },
    promoDesc: { fontSize: 13, color: "#9ca3af", lineHeight: 1.65, marginBottom: 20 },
    promoBtn: {
      background: "#22c55e", border: "none", borderRadius: 26,
      padding: "12px 26px", fontSize: 14, fontWeight: 600,
      fontFamily: "'Poppins',sans-serif", color: "#fff", cursor: "pointer",
    },
    dots: { display: "flex", justifyContent: "center", gap: 6, marginTop: 18 },
    dot: { width: 8, height: 8, borderRadius: "50%", background: "#ccc" },
    dotActive: { width: 20, height: 8, borderRadius: 4, background: "#666" },
  };

  return (
    <>
    <Header />
    <div className="plan-page" style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.inner}>

        <div style={s.heading}>
          <h1 style={s.h1}>Choose your plan</h1>
          <p style={s.sub}>Elevate your social experience with premium networking tools and exclusive insights tailored for modern creators.</p>
        </div>

        <div className="plan-row" style={s.plansRow}>
          {/* Daily */}
          <div style={s.card}>
            <div style={s.planName}>Daily Plan</div>
            <div style={s.planSub}>Short-term Access</div>
            <div style={s.priceRow}>
              <span style={s.symbol}>₹</span>
              <span style={s.amount}>30</span>
              <span style={s.per}>/ 24h</span>
            </div>
            <div style={s.feature}>
              <Check />
              Unlimited Post Any Route For 24 Hours
            </div>
            <button type="button" onClick={() => choosePlan("daily")} style={s.btnOutline}>Go Daily</button>
          </div>

          {/* Monthly */}
          <div style={s.cardFeatured}>
            <div style={s.mostPopular}>MOST POPULAR</div>
            <div style={s.planNameMonthly}>Monthly Plan</div>
            <div style={s.planSub}>High Engagement</div>
            <div style={s.priceRow}>
              <span style={s.symbolPurple}>₹</span>
              <span style={s.amountPurple}>650</span>
              <span style={s.per}>/ mo</span>
            </div>
            <div style={s.feature}>
              <Check color="#7c3aed" bg="#ede9fe" />
              Unlimited Post Any Route For 1 Month
            </div>
            <button type="button" onClick={() => choosePlan("monthly")} style={s.btnFilled}>Go Monthly</button>
          </div>

          {/* Yearly */}
          <div style={s.card}>
            <div style={s.bestValue}>BEST VALUE</div>
            <div style={s.planName}>Yearly Plan</div>
            <div style={s.planSub}>Ultimate Savings</div>
            <div style={s.priceRow}>
              <span style={s.symbol}>₹</span>
              <span style={s.amount}>1200</span>
              <span style={s.per}>/ yr</span>
            </div>
            <div style={s.feature}>
              <Check />
              Unlimited Post Any Route For 1 Year
            </div>
            <button type="button" onClick={() => choosePlan("yearly")} style={s.btnOutline}>Go Yearly</button>
          </div>

        </div>

        {/* Promo Banner */}
        <div style={s.promo}>
          <div style={s.promoImages}>
            <div style={s.promoImgSide} />
            <div style={s.promoImgMid}>
              <img
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80"
                alt="beach"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={s.promoImgSide} />
          </div>
          <div style={s.promoContent}>
            <div style={s.promoLabel}>SPECIAL OFFER</div>
            <div style={s.promoTitle}>Get 20% off on your next trip</div>
            <div style={s.promoDesc}>
              Book your summer getaway through our partner portal and enjoy exclusive
              savings only for LuxeTier users.
            </div>
            <button style={s.promoBtn}>Claim Discount</button>
          </div>
        </div>

        <div style={s.dots}>
          <div style={s.dot} />
          <div style={s.dotActive} />
          <div style={s.dot} />
          <div style={s.dot} />
        </div>

      </div>
    </div>
    <Footer />
    </>
  );
}
