import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import planImage from "../assets/plan-travelmate.png";


/* ─── Icons ─────────────────────────────────────────────────────────────── */

const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="10" fill="#00b37e" />
    <path
      d="M6.5 11l3 3 5.5-6"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ─── Page Component ─────────────────────────────────────────────────────── */

export default function TravelMatePlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSlide, setActiveSlide] = useState(1);

  // Pick up rideId from URL (?rideId=...) — set by FindFriend's handleConnect
  // and also falls back to the localStorage breadcrumb set during the
  // login → otp → profile-setup chain.
  const rideId =
    searchParams.get("rideId") ||
    (() => { try { return localStorage.getItem("pendingUnlockRideId") || ""; } catch { return ""; } })();

  // "Go Daily" → save plan choice and carry rideId to UnlockContact
  const goDaily = () => {
    try { localStorage.setItem("chosenPlan", "daily"); } catch (e) {}
    // Keep the rideId breadcrumb alive so UnlockContact can read it
    if (rideId) {
      try { localStorage.setItem("pendingUnlockRideId", rideId); } catch (e) {}
    }
    console.log("[Findrideplan] Go Daily → /unlock-contact?rideId=" + rideId);
    navigate(rideId ? `/unlock-contact?rideId=${rideId}` : "/unlock-contact");
  };

  const claimDiscount = () => {
    navigate(rideId ? `/unlock-contact?rideId=${rideId}` : "/unlock-contact");
  };

  return (
    <div
      className="plan-page"
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Poppins', system-ui, -apple-system, sans-serif",
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
        <div className="ps-screen">

          {/* ── Header ── */}
          <div className="ps-header">
            <h1 className="ps-heading">Choose your plan</h1>
            <p className="ps-sub">
              Elevate your social experience with premium networking tools and exclusive
              insights tailored for modern creators.
            </p>
          </div>

          {/* ── Daily Plan Card ── */}
          <div className="ps-card">
            <div className="ps-card-left">
              <div className="ps-plan-name">Daily Plan</div>
              <div className="ps-plan-duration">Short-term Access</div>
            </div>
            <div className="ps-card-mid">
              <span className="ps-price">₹30</span>
              <span className="ps-per">/24h</span>
            </div>
            <div className="ps-card-right">
              <div className="ps-feature">
                <span className="ps-tick"><CheckIcon /></span>
                <span>Unlimited Ride For Only This Route For 24 Hours</span>
              </div>
            </div>
            <button className="ps-btn" onClick={goDaily}>Go Daily</button>
          </div>

          {/* ── Offer Banner ── */}
          <div className="ps-offer">
            <div className="ps-offer-images">
              <div className="ps-offer-img-stack">
                <div className="ps-offer-img ps-main">
                  <img src={planImage} alt="trip" />
                </div>
              </div>
            </div>
            <div className="ps-offer-content">
              <div className="ps-offer-tag">SPECIAL OFFER</div>
              <div className="ps-offer-title">Get 20% off on your next trip</div>
              <div className="ps-offer-desc">
                Book your summer getaway through our partner portal and enjoy exclusive
                savings only for LuxeTier users.
              </div>
              <button className="ps-offer-btn" onClick={claimDiscount}>
                Claim Discount
              </button>
            </div>
          </div>

          {/* ── Pagination Dots ── */}
          <div className="ps-dots">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`ps-dot${activeSlide === i ? " ps-dot-active" : ""}`}
                onClick={() => setActiveSlide(i)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </div>

        </div>
      </div>

      <Footer />

      {/* ── All styles inline — no external CSS file needed ── */}
      <style>{`
        /* ── Plan Screen Container ── */
        .ps-screen {
          width: 100%;
          max-width: 1300px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 16px;
          box-sizing: border-box;
        }

        /* ── Header ── */
        .ps-header {
          text-align: center;
          padding: 0 0 8px;
          margin-bottom: 8px;
        }
        .ps-heading {
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          font-size: 48px;
          line-height: 57.6px;
          letter-spacing: -0.96px;
          color: #131313;
          text-align: center;
          margin-bottom: 14px;
        }
        .ps-sub {
          font-family: 'Poppins', sans-serif;
          font-weight: 400;
          font-size: 18px;
          line-height: 28.8px;
          color: #4A4A4A;
          text-align: center;
          max-width: 520px;
          margin: 0 auto;
        }

        /* ── Daily Plan Card ── */
        .ps-card {
          background: #ffffff;
          border-radius: 10px;
          padding: 30px 40px;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 73px;
          box-shadow: 0 0 14px rgba(0,0,0,0.25);
          width: 100%;
          max-width: 1000px;
          min-height: 125px;
          box-sizing: border-box;
          margin: 0 auto;
        }
        .ps-card-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-shrink: 0;
        }
        .ps-plan-name {
          font-family: 'Poppins', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #131313;
          line-height: 1.2;
          white-space: nowrap;
        }
        .ps-plan-duration {
          font-family: 'Poppins', sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: #9aa3b8;
          white-space: nowrap;
        }
        .ps-card-mid {
          display: flex;
          align-items: baseline;
          flex-shrink: 0;
        }
        .ps-price {
          font-family: 'Poppins', sans-serif;
          font-size: 46px;
          font-weight: 800;
          color: #131313;
          letter-spacing: -1.5px;
          line-height: 1;
        }
        .ps-per {
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          font-weight: 400;
          color: #404751;
          margin-left: 3px;
          align-self: flex-end;
          padding-bottom: 5px;
        }
        .ps-card-right {
          flex: 1;
          display: flex;
          align-items: center;
          min-width: 0;
        }
        .ps-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #4a5568;
          line-height: 1.5;
        }
        .ps-tick {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ps-btn {
          flex-shrink: 0;
          margin-left: auto;
          padding: 15px 64px;
          background: transparent;
          color: #1a6644;
          border: 1.5px solid #c9a800;
          border-radius: 10px;
          font-family: Plus Jakarta Sans;
          font-size: 17px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s, color 0.2s;
        }
        .ps-btn:hover {
          background: #c9a800;
          color: #fff;
        }

        /* ── Offer Banner ── */
        .ps-offer {
           background: #0d1b35;
          border-radius: 14px;
          padding: 24px 36px;
          display: flex;
          align-items: center;
          gap: 28px;
          width: 100%;
          max-width: 1150px;
          height:300px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .ps-offer-images { flex-shrink: 0; }
        .ps-offer-img-stack {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ps-offer-img {
          border-radius: 10px;
          overflow: hidden;
          background: #ffffff;
        }
        .ps-offer-img.ps-main {
          width: 372px;
          height: 192px;
        }
        .ps-offer-img.ps-main img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ps-offer-img.ps-side {
          width: 90px;
          height: 120px;
          background: #ffffff;
        }
        .ps-offer-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-left: 20px;
        }
        .ps-offer-tag {
          font-size: 10px;
          font-weight: 400;
          font-family: 'Inter', sans-serif;
          color: #DAE2FD;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .ps-offer-title {
          font-size: 36px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          color: #ffffff;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .ps-offer-desc {
          font-size: 16px;
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          color: #C7C4D7;
          line-height: 1.6;
          margin-bottom: 14px;
          max-width: 690px;
        }
        .ps-offer-btn {
          padding: 10px 24px;
          background: #00A572;
          color: #fff;
          border: none;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: opacity 0.18s;
          width: 198px;
          height: 56px;
        }
        .ps-offer-btn:hover { opacity: 0.88; }

        /* ── Pagination Dots ── */
        .ps-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 2px;
        }
        .ps-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #c8cdd8;
          display: inline-block;
          transition: width 0.3s ease, height 0.3s ease, background 0.3s ease;
        }
        .ps-dot-active {
          background: #6b7280;
          width: 12px;
          height: 12px;
        }

        /* ════════════════════════════════
RESPONSIVE — TABLET (≤1024px)
════════════════════════════════ */
@media (max-width: 1024px) {

.plan-page{
width:100%;
overflow-x:hidden;
}

.ps-screen {
width: 100%;
max-width: 100%;
padding: 0 20px 24px;
box-sizing: border-box;
overflow-x: hidden;
}

.ps-heading {
font-size: 40px;
line-height: 1.3;
letter-spacing: -0.5px;
}

.ps-sub {
font-size: 16px;
line-height: 1.7;
max-width: 100%;
}

.ps-card {
width: 100%;
max-width: 100%;
gap: 28px;
padding: 24px;
flex-wrap: wrap;
}

.ps-price {
font-size: 40px;
}

.ps-feature {
font-size: 14px;
}

.ps-btn {
padding: 14px 28px;
font-size: 15px;
}

.ps-offer {
width: 100%;
max-width: 100%;
height: auto;
padding: 28px 24px;
gap: 24px;
}

.ps-offer-title {
font-size: 30px;
}

.ps-offer-desc {
font-size: 15px;
max-width: 100%;
}

.ps-offer-img.ps-main {
width: 320px;
height: 180px;
}
}

/* ════════════════════════════════
RESPONSIVE — MOBILE (≤768px)
════════════════════════════════ */
@media (max-width: 768px) {

.plan-page{
width:100%;
overflow-x:hidden;
}

.ps-screen {
width: 100%;
max-width: 100%;
padding: 0 16px 24px;
gap: 18px;
overflow-x: hidden;
}

.ps-header {
padding: 0;
margin-bottom: 10px;
}

.ps-heading {
font-size: 30px;
line-height: 1.3;
letter-spacing: -0.4px;
margin-bottom: 12px;
}

.ps-sub {
font-size: 14px;
line-height: 1.7;
max-width: 100%;
}

.ps-card {
width: 100%;
max-width: 100%;
flex-direction: column;
align-items: flex-start;
gap: 18px;
padding: 22px 18px;
border-radius: 16px;
}

.ps-card-left {
width: 100%;
}

.ps-plan-name {
font-size: 18px;
}

.ps-plan-duration {
font-size: 12px;
}

.ps-card-mid {
width: 100%;
}

.ps-price {
font-size: 36px;
}

.ps-per {
font-size: 14px;
padding-bottom: 4px;
}

.ps-card-right {
width: 100%;
align-items: flex-start;
}

.ps-feature {
align-items: flex-start;
font-size: 13px;
line-height: 1.6;
word-break: break-word;
}

.ps-tick {
width: 20px;
height: 20px;
min-width: 20px;
margin-top: 2px;
}

.ps-btn {
width: 100%;
margin-left: 0;
text-align: center;
padding: 14px 20px;
font-size: 14px;
border-radius: 10px;
}

.ps-offer {
width: 100%;
max-width: 100%;
height: auto;
flex-direction: column;
align-items: center;
text-align: center;
padding: 24px 18px;
border-radius: 18px;
gap: 22px;
}

.ps-offer-images {
width: 100%;
}

.ps-offer-img-stack {
justify-content: center;
width: 100%;
}

.ps-offer-img.ps-main {
width: 100%;
max-width: 100%;
height: 190px;
}

.ps-offer-img.ps-main img {
width: 100%;
height: 100%;
object-fit: cover;
}

.ps-offer-content {
width: 100%;
align-items: center;
padding-left: 0;
}

.ps-offer-tag {
font-size: 10px;
letter-spacing: 1.5px;
}

.ps-offer-title {
font-size: 24px;
line-height: 1.4;
}

.ps-offer-desc {
font-size: 14px;
line-height: 1.7;
margin-bottom: 18px;
max-width: 100%;
}

.ps-offer-btn {
width: 100%;
max-width: 240px;
height: 50px;
font-size: 15px;
}

.ps-dots {
margin-top: 10px;
}

.ps-dot {
width: 8px;
height: 8px;
}

.ps-dot-active {
width: 10px;
height: 10px;
}
}

/* ════════════════════════════════
RESPONSIVE — SMALL MOBILE (≤480px)
════════════════════════════════ */
@media (max-width: 480px) {

.ps-screen{
padding:0 12px 20px;
}

.ps-heading {
font-size: 24px;
line-height: 1.4;
}

.ps-sub {
font-size: 13px;
line-height: 1.7;
}

.ps-card {
padding: 18px 14px;
gap: 16px;
}

.ps-plan-name {
font-size: 17px;
}

.ps-price {
font-size: 32px;
}

.ps-per {
font-size: 13px;
}

.ps-feature {
font-size: 12px;
line-height: 1.6;
}

.ps-btn {
font-size: 13px;
padding: 13px 18px;
}

.ps-offer {
padding: 20px 14px;
gap: 18px;
}

.ps-offer-img.ps-main {
height: 170px;
}

.ps-offer-title {
font-size: 22px;
line-height: 1.4;
}

.ps-offer-desc {
font-size: 13px;
line-height: 1.7;
}

.ps-offer-btn {
width: 100%;
height: 48px;
font-size: 14px;
}
}


       
      `}</style>
    </div>
  );
}
