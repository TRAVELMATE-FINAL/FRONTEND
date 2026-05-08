import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer/Footer.jsx";

const API_BASE = import.meta.env.VITE_APP_URL || "http://localhost:5000";

const Check = ({ color = "#22c55e", bg = "#e8f5e9" }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
    <circle cx="9" cy="9" r="9" fill={bg} />
    <path d="M5.5 9l2.5 2.5 4.5-5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DEFAULT_PLANS = {
  daily:   { price: 30,   feature: "Unlock 1 contact for 24 hours" },
  monthly: { price: 650,  feature: "Unlimited contacts for 30 days" },
  yearly:  { price: 1200, feature: "Unlimited contacts + premium support" },
};

export default function Findrideplan() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [activeSub, setActiveSub] = useState(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Pull live plan prices + (if logged in) the user's active subscription
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(API_BASE + "/api/plans/");
        if (r.ok) {
          const data = await r.json();
          if (!cancelled && data?.plans) {
            const next = { ...DEFAULT_PLANS };
            data.plans.forEach((p) => {
              if (next[p.key]) next[p.key] = { ...next[p.key], price: p.price, durationDays: p.durationDays };
            });
            setPlans(next);
          }
        }
      } catch { /* keep defaults */ }

      try {
        const phone = localStorage.getItem("phone");
        if (!phone) return;
        const r = await fetch(API_BASE + "/api/plans/me?phone=" + encodeURIComponent(phone));
        if (r.ok) {
          const data = await r.json();
          if (!cancelled && data?.active) setActiveSub(data.subscription);
        }
      } catch { /* not logged in or no sub */ }
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * Click handler — runs when user picks Daily / Monthly / Yearly.
   * 1) Check the user is logged in (phone in localStorage). If not,
   *    save the chosen plan and bounce them through /login → /otp.
   * 2) If logged in, save the chosen plan and route to /securepayment
   *    where they enter coupon + pay via Razorpay. After verification
   *    SecurePayment.jsx auto-navigates to /connect-unlock?rideId=...
   *    (the pendingUnlockRideId set when the user first tapped Unlock).
   */
  const choosePlan = (planKey) => {
    console.log("[Findrideplan] choosePlan:", planKey);
    try { localStorage.setItem("chosenPlan", planKey); } catch (e) {}

    const phone = localStorage.getItem("phone") || "";
    const isLoggedIn = /^\+?\d{10,13}$/.test(phone);
    if (!isLoggedIn) {
      // Send the user through the auth chain — pendingUnlockRideId
      // is already in localStorage from ConnectUnlock, so the chain
      // ends back here automatically.
      navigate("/login");
      return;
    }
    navigate("/securepayment");
  };

  const PlanCard = ({ planKey, name, sub, price, perLabel, feature, featured, badge, badgeColor }) => (
    <div style={{
      background: "#fff",
      border: featured ? "2.5px solid #a78bfa" : "1.5px solid #ebebeb",
      borderRadius: 18, padding: featured ? "38px 28px 28px" : "32px 24px 24px",
      flex: "1 1 240px", minWidth: 240, maxWidth: 280,
      position: "relative", boxSizing: "border-box",
      boxShadow: featured ? "0 10px 40px rgba(120,80,255,0.13)" : "none",
    }}>
      {badge && (
        <div style={{
          position: featured ? "absolute" : "absolute",
          top: featured ? -16 : 0,
          left: featured ? "50%" : "auto",
          right: featured ? "auto" : 0,
          transform: featured ? "translateX(-50%)" : "none",
          background: badgeColor, color: "#fff",
          fontSize: 11, fontWeight: 700,
          padding: "5px 14px",
          borderRadius: featured ? 20 : "0 16px 0 16px",
          whiteSpace: "nowrap", letterSpacing: "0.5px",
        }}>{badge}</div>
      )}
      <div style={{ fontSize: 20, fontWeight: 700, color: featured ? "#7c3aed" : "#111", marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 18 }}>{sub}</div>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", gap: 2 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: featured ? "#7c3aed" : "#111", lineHeight: 1.6 }}>₹</span>
        <span style={{ fontSize: 48, fontWeight: 800, color: featured ? "#7c3aed" : "#111", lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: 13, color: "#aaa", marginBottom: 8, marginLeft: 2 }}>{perLabel}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#555", lineHeight: 1.5, marginBottom: 22 }}>
        <Check color={featured ? "#7c3aed" : "#22c55e"} bg={featured ? "#ede9fe" : "#e8f5e9"} />
        {feature}
      </div>
      <button
        type="button"
        onClick={() => choosePlan(planKey)}
        style={{
          width: "100%", borderRadius: 12, padding: 13,
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          background: featured ? "#7c3aed" : "#fff",
          border: featured ? "none" : "1.5px solid #d0d0d0",
          color: featured ? "#fff" : "#333",
          fontFamily: "inherit",
          transition: "background 0.15s",
        }}
      >
        Go {name.split(" ")[0]}
      </button>
    </div>
  );

  return (
    <>
      <div style={{
        fontFamily: "'Poppins','Segoe UI',sans-serif",
        background: "#f5f5f7", minHeight: "100vh",
        display: "flex", flexDirection: "column",
      }}>
        <section style={{ background: "#fff", padding: "48px 20px 36px", textAlign: "center", flex: 1 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#111", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
            Choose your plan
          </h1>
          <p style={{ color: "#666", fontSize: 15, maxWidth: 540, margin: "8px auto 24px", lineHeight: 1.6 }}>
            Pick a plan to unlock contacts. Coupons applied at the next step.
          </p>

          {activeSub && (
            <div style={{
              background: "#ecfdf5", border: "1px solid #a7f3d0",
              color: "#065f46", padding: "12px 16px", borderRadius: 12,
              margin: "0 auto 26px", maxWidth: 700,
              fontSize: 14, fontWeight: 600,
            }}>
              ✅ You're on the <b>{activeSub.plan}</b> plan — {activeSub.daysLeft} day(s) left.
            </div>
          )}

          <div style={{
            display: "flex", justifyContent: "center", alignItems: "stretch",
            gap: 20, flexWrap: "wrap", maxWidth: 920, margin: "0 auto",
          }}>
            <PlanCard
              planKey="daily"
              name="Daily Plan" sub="Short-term Access"
              price={plans.daily.price} perLabel="/ 24h"
              feature="Unlimited Post Any Route For 24 Hours"
              badge="STARTER" badgeColor="#0ea5e9"
            />
            <PlanCard
              planKey="monthly"
              name="Monthly Plan" sub="High Engagement"
              price={plans.monthly.price} perLabel="/ mo"
              feature="Unlimited Post Any Route For 1 Month"
              featured
              badge="MOST POPULAR" badgeColor="#7c3aed"
            />
            <PlanCard
              planKey="yearly"
              name="Yearly Plan" sub="Ultimate Savings"
              price={plans.yearly.price} perLabel="/ yr"
              feature="Unlimited Post Any Route For 1 Year"
              badge="BEST VALUE" badgeColor="#0ea5e9"
            />
          </div>

          <div style={{ marginTop: 30, fontSize: 12.5, color: "#888" }}>
            🔒 Secure payment via Razorpay • Coupons available at checkout
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
