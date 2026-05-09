import { useLayoutEffect, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const Check = ({ color = "#22c55e", bg = "#e8f5e9" }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="9" cy="9" r="9" fill={bg} />
    <path d="M5.5 9l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Plan catalogue (used as instant render values; backend may override after fetch).
const DEFAULT_PLANS = {
  daily:   { price: 30,   per: "/ 24h", name: "Daily Plan",   sub: "Short-term Access",  feature: "Unlimited Post Any Route For 24 Hours" },
  monthly: { price: 650,  per: "/ mo",  name: "Monthly Plan", sub: "High Engagement",    feature: "Unlimited Post Any Route For 1 Month"  },
  yearly:  { price: 1200, per: "/ yr",  name: "Yearly Plan",  sub: "Ultimate Savings",   feature: "Unlimited Post Any Route For 1 Year"   },
};

export default function ChooseYourPlan() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [activeSub, setActiveSub] = useState(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch real prices in the background — page renders fine if this fails.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const baseURL = (import.meta.env.VITE_APP_URL || "http://localhost:5000") + "/api";
        const r = await fetch(baseURL + "/plans/");
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled || !data?.plans) return;
        const next = { ...DEFAULT_PLANS };
        data.plans.forEach((p) => {
          if (next[p.key]) next[p.key] = { ...next[p.key], price: p.price };
        });
        setPlans(next);
      } catch {
        /* ignore — defaults are fine */
      }

      try {
        const phone = localStorage.getItem("phone");
        if (!phone) return;
        const baseURL = (import.meta.env.VITE_APP_URL || "http://localhost:5000") + "/api";
        const r = await fetch(baseURL + "/plans/me?phone=" + encodeURIComponent(phone));
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && data?.active) setActiveSub(data.subscription);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Direct, synchronous click handler — saves the chosen plan + navigates.
  const choosePlan = (planKey) => {
    console.log("[Chooseyourplan] choosePlan:", planKey);
    try { localStorage.setItem("chosenPlan", planKey); } catch (e) {}
    navigate("/securepayment");
  };

  const s = {
    page:        { fontFamily: "'Poppins', sans-serif", background: "#f5f5f7", minHeight: "100vh",
                   display: "flex", justifyContent: "center", padding: "48px 20px 28px" },
    inner:       { width: "100%", maxWidth: 900 },
    heading:     { textAlign: "center", marginBottom: 40 },
    h1:          { fontSize: 36, fontWeight: 700, color: "#111", margin: 0 },
    sub:         { fontSize: 14, color: "#888", lineHeight: 1.7, maxWidth: 520, margin: "10px auto 0" },
    plansRow:    { display: "flex", justifyContent: "center", alignItems: "stretch",
                   marginBottom: 32, gap: 18, flexWrap: "wrap" },
    card:        { background: "#fff", borderRadius: 18, padding: "32px 28px 28px",
                   flex: "1 1 240px", minWidth: 240, maxWidth: 280, position: "relative",
                   border: "1.5px solid #ebebeb", boxSizing: "border-box" },
    cardFeatured:{ background: "#fff", borderRadius: 22, padding: "38px 32px 32px",
                   flex: "1 1 240px", minWidth: 240, maxWidth: 280, position: "relative",
                   border: "2.5px solid #a78bfa",
                   boxShadow: "0 10px 40px rgba(120,80,255,0.13)", boxSizing: "border-box" },
    mostPopular: { position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)",
                   background: "#7c3aed", color: "#fff", fontSize: 11, fontWeight: 700,
                   padding: "5px 18px", borderRadius: 20, whiteSpace: "nowrap" },
    bestValue:   { position: "absolute", top: 0, right: 0, background: "#0ea5e9",
                   color: "#fff", fontSize: 10, fontWeight: 700, padding: "7px 13px",
                   borderRadius: "0 16px 0 16px", letterSpacing: "0.5px" },
    planName:    { fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 4 },
    planNameP:   { fontSize: 20, fontWeight: 700, color: "#7c3aed", marginBottom: 4 },
    planSub:     { fontSize: 13, color: "#aaa", marginBottom: 22 },
    priceRow:    { marginBottom: 22, display: "flex", alignItems: "flex-end", gap: 2 },
    sym:         { fontSize: 26, fontWeight: 700, color: "#111", lineHeight: 1.6 },
    symP:        { fontSize: 26, fontWeight: 700, color: "#7c3aed", lineHeight: 1.6 },
    amt:         { fontSize: 52, fontWeight: 800, color: "#111", lineHeight: 1 },
    amtP:        { fontSize: 52, fontWeight: 800, color: "#7c3aed", lineHeight: 1 },
    per:         { fontSize: 14, color: "#aaa", marginBottom: 7, marginLeft: 2 },
    feature:     { display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13,
                   color: "#555", lineHeight: 1.5, marginBottom: 24 },
    btnOutline:  { width: "100%", borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 600,
                   fontFamily: "'Poppins',sans-serif", cursor: "pointer",
                   background: "#fff", border: "1.5px solid #d0d0d0", color: "#333",
                   transition: "background 0.15s, color 0.15s" },
    btnFilled:   { width: "100%", borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 600,
                   fontFamily: "'Poppins',sans-serif", cursor: "pointer",
                   background: "#7c3aed", border: "none", color: "#fff",
                   transition: "background 0.15s" },
  };

  return (
    <>
      <Header />
      <div className="plan-page" style={s.page}>
        <div style={s.inner}>
          <div style={s.heading}>
            <h1 style={s.h1}>Choose your plan</h1>
            <p style={s.sub}>
              Elevate your social experience with premium networking tools and
              exclusive insights tailored for modern creators.
            </p>
          </div>

          {activeSub && (
            <div style={{
              background: "#ecfdf5", border: "1px solid #a7f3d0",
              color: "#065f46", padding: "12px 16px", borderRadius: 12,
              margin: "0 auto 26px", maxWidth: 700, textAlign: "center",
              fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 600,
            }}>
              ✅ You are on the <b>{activeSub.plan}</b> plan — {activeSub.daysLeft} day(s) left.
            </div>
          )}

          <div className="plan-row" style={s.plansRow}>
            {/* Daily */}
            <div style={s.card}>
              <div style={s.planName}>Daily Plan</div>
              <div style={s.planSub}>Short-term Access</div>
              <div style={s.priceRow}>
                <span style={s.sym}>₹</span>
                <span style={s.amt}>{plans.daily.price}</span>
                <span style={s.per}>/ 24h</span>
              </div>
              <div style={s.feature}>
                <Check />
                {plans.daily.feature}
              </div>
              <button
                type="button"
                onClick={() => choosePlan("daily")}
                style={s.btnOutline}
              >
                Go Daily
              </button>
            </div>

            {/* Monthly */}
            <div style={s.cardFeatured}>
              <div style={s.mostPopular}>MOST POPULAR</div>
              <div style={s.planNameP}>Monthly Plan</div>
              <div style={s.planSub}>High Engagement</div>
              <div style={s.priceRow}>
                <span style={s.symP}>₹</span>
                <span style={s.amtP}>{plans.monthly.price}</span>
                <span style={s.per}>/ mo</span>
              </div>
              <div style={s.feature}>
                <Check color="#7c3aed" bg="#ede9fe" />
                {plans.monthly.feature}
              </div>
              <button
                type="button"
                onClick={() => choosePlan("monthly")}
                style={s.btnFilled}
              >
                Go Monthly
              </button>
            </div>

            {/* Yearly */}
            <div style={s.card}>
              <div style={s.bestValue}>BEST VALUE</div>
              <div style={s.planName}>Yearly Plan</div>
              <div style={s.planSub}>Ultimate Savings</div>
              <div style={s.priceRow}>
                <span style={s.sym}>₹</span>
                <span style={s.amt}>{plans.yearly.price}</span>
                <span style={s.per}>/ yr</span>
              </div>
              <div style={s.feature}>
                <Check />
                {plans.yearly.feature}
              </div>
              <button
                type="button"
                onClick={() => choosePlan("yearly")}
                style={s.btnOutline}
              >
                Go Yearly
              </button>
            </div>
          </div>

          {/* Hard-link fallback in case React Router was misconfigured. */}
          <div style={{ textAlign: "center", marginTop: 24, fontSize: 12.5, color: "#888" }}>
            Buttons not working? <Link to="/securepayment" style={{ color: "#2563eb", fontWeight: 600 }}>
              Go to payment page directly
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
