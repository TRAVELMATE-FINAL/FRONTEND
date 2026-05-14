import { useState, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import planImage from "../assets/plan-travelmate.png";

/* ─── Data ───────────────────────────────────────────────────────────────── */

const PLANS = [
  {
    id: "daily",
    name: "Daily Plan",
    subtitle: "Short-term Access",
    price: "30",
    per: "/ 24h",
    feature: "Unlimited Post Any Route For 24 Hours",
    badge: null,
    corner: false,
    btnLabel: "Go Daily",
    highlight: false,
  },
  {
    id: "monthly",
    name: "Monthly Plan",
    subtitle: "High Engagement",
    price: "650",
    per: "/ mo",
    feature: "Unlimited Post Any Route For 1 Month",
    badge: "MOST POPULAR",
    corner: false,
    btnLabel: "Go Monthly",
    highlight: true,
  },
  {
    id: "yearly",
    name: "Yearly Plan",
    subtitle: "Ultimate Savings",
    price: "1200",
    per: "/ yr",
    feature: "Unlimited Post Any Route For 1 Year",
    badge: "BEST VALUE",
    corner: true,
    btnLabel: "Go Yearly",
    highlight: false,
  },
];

/* ─── Icons ──────────────────────────────────────────────────────────────── */

const CheckIcon = ({ active }) => (
  <span
    className="prp-tick"
    style={active ? { background: "#7c3aed" } : {}}
  >
    ✓
  </span>
);

/* ─── Page Component ─────────────────────────────────────────────────────── */

export default function PlanPage() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(1);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const choosePlan = (planId) => {
    console.log("[PlanPage] choosePlan:", planId);
    try { localStorage.setItem("chosenPlan", planId); } catch (e) {}
    navigate("/securepayment");
  };

  return (
    <>
      <Header />

      <div className="prp-page">
        <div className="prp-container">

          {/* ── Header ── */}
          <div className="prp-header">
            <h1 className="prp-heading">Choose your plan</h1>
            <p className="prp-sub">
              Elevate your social experience with premium networking tools and exclusive
              insights tailored for modern creators.
            </p>
          </div>

          {/* ── 3 Plan Cards ── */}
          <div className="prp-cards">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`prp-card prp-card--${plan.id}${plan.highlight ? " prp-card--active" : ""}`}
                onClick={() => choosePlan(plan.id)}
              >
                {/* Top-center badge (MOST POPULAR) */}
                {plan.badge && !plan.corner && (
                  <div className="prp-badge">{plan.badge}</div>
                )}
                {/* Corner ribbon badge (BEST VALUE) */}
                {plan.badge && plan.corner && (
                  <div className="prp-corner-badge">{plan.badge}</div>
                )}

                <div className="prp-plan-name">{plan.name}</div>
                <div className="prp-plan-sub">{plan.subtitle}</div>

                <div className="prp-price-row">
                  <span className="prp-symbol">₹</span>
                  <span className="prp-price">{plan.price}</span>
                  <span className="prp-per">{plan.per}</span>
                </div>

                <div className="prp-feature">
                  <CheckIcon active={plan.highlight} />
                  <span>{plan.feature}</span>
                </div>

                <button
                  type="button"
                  className={`prp-btn${plan.highlight ? " prp-btn--active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); choosePlan(plan.id); }}
                >
                  {plan.btnLabel}
                </button>
              </div>
            ))}
          </div>

          {/* ── Offer Banner ── */}
          <div className="prp-offer">
            <div className="prp-offer-imgs">
              <div className="prp-offer-img prp-img-main">
                <img src={planImage} alt="trip" />
              </div>
            </div>
            <div className="prp-offer-content">
              <div className="prp-offer-tag">SPECIAL OFFER</div>
              <div className="prp-offer-title">Get 20% off on your next trip</div>
              <div className="prp-offer-desc">
                Book your summer getaway through our partner portal and enjoy exclusive
                savings only for LuxeTier users.
              </div>
              <button className="prp-offer-btn">Claim Discount</button>
            </div>
          </div>

          {/* ── Dots ── */}
          <div className="prp-dots">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`prp-dot${activeSlide === i ? " prp-dot--active" : ""}`}
                onClick={() => setActiveSlide(i)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </div>

        </div>
      </div>

      <Footer />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        /* ════════════════════════════
           PAGE WRAPPER
        ════════════════════════════ */
        .prp-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(160deg, #dde1ed 0%, #e8eaf2 40%, #f0f2f7 100%);
        }

        .prp-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 24px 0;
          box-sizing: border-box;
        }

        /* ════════════════════════════
           HEADER
        ════════════════════════════ */
        .prp-header {
          text-align: center;
          margin-bottom: 36px;
        }
        .prp-heading {
          font-size: 48px;
          font-weight: 600;              /* valid: 600 = semi-bold */
          color: #0B1C30;
          margin: 0 0 12px;
          letter-spacing: -0.5px;
          margin-top: 20px;
          font-family: 'Poppins', sans-serif;
        }
        .prp-sub {
          font-size: 18px;
          color: #404751;
          max-width: 690px;
          margin: 0 auto;
          line-height: 1.7;
          font-family: 'Poppins', sans-serif;
          font-weight: 400;
        }

        /* ════════════════════════════
           CARDS ROW
           FIX: Remove fixed width/height on cards — use flex + min-height instead
        ════════════════════════════ */
        .prp-cards {
          display: flex;
          gap: 16px;
          justify-content: center;
          align-items: center;         /* center-align so monthly lifts up */
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          padding: 26px 24px 40px;
          box-sizing: border-box;
        }

        /* ── BASE CARD ──
           FIX: NO fixed width/height — use flex:1 and min-height
           This allows font-size/weight changes to resize naturally
        ── */
        .prp-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 32px 20px 24px;
          flex: 1;                     /* each card takes equal width */
          min-width: 0;                /* prevent overflow */
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          box-shadow: 0 2px 12px rgba(0,0,0,0.07);
          border: 2px solid transparent;
          box-sizing: border-box;
          overflow: hidden;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          cursor: pointer;
          /* FIX: no fixed height — card grows with content */
        }

        .prp-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.13);
          border-color: #8467b7;
        }

        /* ── DAILY CARD ── */
        .prp-card--daily {
          background: #ffffff;
          border-color: #e5e7eb;
          /* FIX: no fixed width/height — flex handles sizing */
           width:290px;
          height:369px;
        }
        .prp-card--daily .prp-plan-name {
          color: #0B1C30;
          font-family: 'Plus Jakarta Sans', sans-serif;  /* FIX: proper font-family string */
          font-weight: 700;                               /* FIX: font-style:bold → font-weight:700 */
          font-size: 24px;
            font-style: bold;
        }
        .prp-card--daily .prp-plan-sub {
          color: #707882;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;                               /* FIX: font-style:semi-bold → font-weight:600 */
          font-size: 12px;
            font-style: semi-bold;
                                     /* FIX: remove italic */
        }
        .prp-card--daily .prp-symbol,
        .prp-card--daily .prp-price {
          color: #111827;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 48px;
          font-style: extrabold;
         

        }
          .prp-card--daily .prp-per{
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 400;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 16px;
          
        }
          .prp-card--daily .prp-feature{
          font-family: var(inter);
          font-weight: 400;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 16px;
      }
      
        .prp-card--daily .prp-tick { background: #10b981; }
        .prp-card--daily .prp-btn {
          background: transparent;
          border: 1.5px solid #54AFFF;
          color: #006C49;
          fontfamily:Plus Jakarta Sans ;
          font-weight: 600;
          font-size: 16px;
        }
        .prp-card--daily .prp-btn:hover {
          border-color: #7c3aed;
          color: #7c3aed;
          background: #f5f3ff;
        }

        /* ── MONTHLY CARD (highlighted) ── */
        .prp-card--monthly {
          border: 2px solid #7c3aed;
          box-shadow: 0 6px 28px rgba(124,58,237,0.18);
          /* FIX: no fixed width/height — use margin-top to lift it */
           width:290px;
          height:437px;
          margin-top: -34px;
          
        }
        .prp-card--monthly:hover {
          box-shadow: 0 14px 36px rgba(124,58,237,0.26);
        }
        .prp-card--monthly .prp-plan-name {
         color: #00629F;
          font-family: 'Plus Jakarta Sans', sans-serif;  /* FIX: proper font-family string */
          font-weight: 700;                               /* FIX: font-style:bold → font-weight:700 */
          font-size: 24px;
            font-style: bold;
            padding-top: 38px;
          }
          .prp-card--monthly .prp-plan-sub {
          color: #707882;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;                               /* FIX: font-style:semi-bold → font-weight:600 */
          font-size: 12px;
            font-style: semi-bold;
                                     /* FIX: remove italic */
        }
        .prp-card--monthly .prp-symbol,
        .prp-card--monthly .prp-price {
          color: #111827;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 48px;
          font-style: extrabold;
         

        }
             .prp-card--monthly .prp-per{
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 400;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 16px;
          
        }
          .prp-card--monthly .prp-feature{
          font-family: var(inter);
          font-weight: 400;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 16px;
         
      }
        .prp-card--monthly .prp-tick      { background: #10b981; }
        .prp-card--monthly .prp-btn {
          background: #7c3aed;
          border: none;
          color: #fff;
          fontfamily:Plus Jakarta Sans ;
          font-weight: 600;
          font-size: 16px;
         
        }
        .prp-card--monthly .prp-btn:hover {
          background: #6d28d9;
        }

        /* ── YEARLY CARD ── */
        .prp-card--yearly {
          background: #ffffff;
          border-color: #e5e7eb;
          /* FIX: no fixed width/height */
          width:290px;
          height:369px;
        }
        .prp-card--yearly .prp-plan-name  {
         color: #0B1C30;
          font-family: 'Plus Jakarta Sans', sans-serif;  /* FIX: proper font-family string */
          font-weight: 700;                               /* FIX: font-style:bold → font-weight:700 */
          font-size: 24px;
            font-style: bold;
          }
             .prp-card--yearly .prp-plan-sub {
          color: #707882;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;                               /* FIX: font-style:semi-bold → font-weight:600 */
          font-size: 12px;
            font-style: semi-bold;
                                     /* FIX: remove italic */
        }
        .prp-card--yearly .prp-symbol,
        .prp-card--yearly .prp-price      {
        color: #111827;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 800;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 48px;
          font-style: extrabold;;
          }
               .prp-card--yearly .prp-per{
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 400;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 16px;
          
        }
          .prp-card--yearly .prp-feature{
          font-family: var(inter);
          font-weight: 400;                               /* FIX: font-style:extrabold → font-weight:800 */
          font-size: 16px;
      }
        .prp-card--yearly .prp-tick       {
         background: #10b981;
          }
        .prp-card--yearly .prp-btn {
          background: transparent;
          border: 1.5px solid #006C49;
          color: #006C49;
          fontfamily:Plus Jakarta Sans ;
          font-weight: 600;
          font-size: 16px;
        }
        .prp-card--yearly .prp-btn:hover {
          border-color: #006C49;
          color: #006C49;
          background: #f5f3ff;

        }

        /* ── MOST POPULAR badge ── */
        .prp-badge {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          background: #7c3aed;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1.5px;
          padding: 5px 18px;
          border-radius: 0 0 10px 10px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* ── BEST VALUE corner ribbon ── */
        .prp-corner-badge {
          position: absolute;
          top: 20px;
          right: -28px;
          background: #0ea5e9;
          color: #fff;
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 5px 36px;
          transform: rotate(45deg);
          text-transform: uppercase;
          white-space: nowrap;
        }

        /* ── Card content ── */
        .prp-plan-name {
          font-size: 16px;
          font-weight: 700;
          margin-top: 10px;
        }
        .prp-plan-sub {
          font-size: 12px;
          color: #9ca3af;
          margin-top: -4px;
        }
        .prp-price-row {
          display: flex;
          align-items: baseline;
          gap: 2px;
          margin: 8px 0 2px;
        }
        .prp-symbol {
          font-size: 26px;
          font-weight: 700;
          line-height: 1.6;
        }
        .prp-price {
          font-size: 44px;
          font-weight: 800;
          letter-spacing: -1.5px;
          line-height: 1;
        }
        .prp-per {
          font-size: 13px;
          color: #9ca3af;
          align-self: flex-end;
          padding-bottom: 6px;
          margin-left: 2px;
        }
        .prp-feature {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
          flex: 1;                    /* FIX: pushes button to bottom of card */
          margin-top: 4px;
        }
        .prp-tick {
          width: 22px;
          height: 22px;
          min-width: 22px;
          border-radius: 50%;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
          background: #10b981;        /* default green */
        }
        .prp-btn {
          width: 100%;
          padding: 13px 0;
          border-radius: 10px;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: auto;           /* FIX: always stays at bottom of card */
          flex-shrink: 0;             /* FIX: never gets squished */
        }

        /* ════════════════════════════
           OFFER BANNER
        ════════════════════════════ */
        .prp-offer {
          background: #0d1b35;
          border-radius: 14px;
          padding: 24px 36px;
          display: flex;
          align-items: center;
          gap: 28px;
          width: 100%;
          max-width: 1200px;
          height:300px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .prp-offer-imgs {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .prp-offer-img {
          border-radius: 10px;
          overflow: hidden;
        }
        .prp-img-main {
          width: 372px;
          height: 192px;
        }
        .prp-img-main img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .prp-offer-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-left: 20px;
        }
        .prp-offer-tag {
          font-size: 10px;
          font-weight: 400;
          font-family: 'Inter', sans-serif;
          color: #DAE2FD;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .prp-offer-title {
          font-size: 36px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          color: #ffffff;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .prp-offer-desc {
          font-size: 16px;
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          color: #C7C4D7;
          line-height: 1.6;
          margin-bottom: 14px;
          max-width: 690px;
        }
        .prp-offer-btn {
          padding: 10px 24px;
          background: #00A572;
          color: #fff;
          border: none;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.18s;
          width: 198px;
          height: 56px;
        }
        .prp-offer-btn:hover { background: #059669; }

        /* ════════════════════════════
           DOTS
        ════════════════════════════ */
        .prp-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          margin-bottom: 50px;
        }
        .prp-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #d1d5db;
          display: inline-block;
          transition: all 0.3s ease;
        }
        .prp-dot--active {
          background: #6b7280;
          width: 20px;
          height: 8px;
          border-radius: 4px;
        }

        /* ════════════════════════════
           RESPONSIVE — TABLET (≤1024px)
        ════════════════════════════ */
        @media (max-width: 1024px) {
          .prp-heading { font-size: 32px; line-height: 1.3; }
          .prp-sub { font-size: 13px; padding: 0 10px; }
          .prp-cards { gap: 14px; }
          .prp-card { padding: 28px 18px 22px; }
          .prp-price { font-size: 38px; }
          .prp-offer { flex-direction: column; align-items: flex-start; padding: 28px 24px; gap: 24px; }
          .prp-offer-content { padding-left: 0; width: 100%; }
          .prp-offer-title { font-size: 30px; }
          .prp-offer-desc { font-size: 15px; max-width: 100%; }
          .prp-offer-btn { width: 180px; height: 52px; font-size: 15px; }
        }

        /* ════════════════════════════
           RESPONSIVE — MOBILE (≤768px)
        ════════════════════════════ */
        @media (max-width: 768px) {
          .prp-page { overflow-x: hidden; }
          .prp-header { margin-bottom: 24px; padding: 0 16px; }
          .prp-heading { font-size: 28px; line-height: 1.3; margin-top: 10px; }
          .prp-sub { font-size: 13px; line-height: 1.6; max-width: 100%; }
          .prp-cards { flex-direction: column; align-items: stretch; gap: 18px; padding: 0 16px; }
          .prp-card { width: 100%; max-width: 100%; padding: 28px 18px 22px; border-radius: 18px; margin-top: 0 !important; }
          .prp-plan-name { font-size: 18px; }
          .prp-plan-sub { font-size: 12px; }
          .prp-price { font-size: 40px; }
          .prp-feature { font-size: 13px; line-height: 1.6; }
          .prp-btn { height: 48px; font-size: 14px; }
          .prp-offer { flex-direction: column; align-items: center; text-align: center; padding: 24px 18px; border-radius: 18px; gap: 22px; }
          .prp-offer-imgs { justify-content: center; width: 100%; }
          .prp-img-main { width: 100px; height: 110px; }
          .prp-offer-content { padding-left: 0; align-items: center; }
          .prp-offer-tag { font-size: 10px; letter-spacing: 1.5px; }
          .prp-offer-title { font-size: 24px; line-height: 1.4; }
          .prp-offer-desc { font-size: 14px; line-height: 1.7; margin-bottom: 18px; }
          .prp-offer-btn { width: 100%; max-width: 240px; height: 50px; font-size: 15px; }
          .prp-dots { margin-top: 18px; margin-bottom: 40px; }
        }

        /* ════════════════════════════
           RESPONSIVE — SMALL MOBILE (≤480px)
        ════════════════════════════ */
        @media (max-width: 480px) {
          .prp-heading { font-size: 24px; }
          .prp-sub { font-size: 12px; }
          .prp-card { padding: 24px 16px 20px; }
          .prp-price { font-size: 34px; }
          .prp-per { font-size: 12px; }
          .prp-feature { font-size: 12px; }
          .prp-tick { width: 20px; height: 20px; min-width: 20px; font-size: 10px; }
          .prp-badge { font-size: 8px; padding: 4px 14px; }
          .prp-corner-badge { font-size: 7px; right: -32px; padding: 5px 34px; }
          .prp-offer-title { font-size: 22px; }
          .prp-offer-desc { font-size: 13px; }
          .prp-offer-btn { font-size: 14px; height: 48px; }
        }
      `}</style>
    </>
  );
}
