import { useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── SVG vehicle icons ── */
function VehicleIcon({ type, size, color, style = {} }) {
  if (type === "moto") return (
    <svg width={size} height={size} viewBox="0 0 64 40" fill="none" style={style}>
      <circle cx="12" cy="30" r="9" stroke={color} strokeWidth="3" fill="none"/>
      <circle cx="52" cy="30" r="9" stroke={color} strokeWidth="3" fill="none"/>
      <path d="M12 30 L22 14 L38 14 L44 22 L52 22" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M34 14 L40 6 L50 6" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="45" cy="10" rx="5" ry="4" fill={color} opacity="0.7"/>
    </svg>
  );
  if (type === "bike") return (
    <svg width={size} height={size} viewBox="0 0 64 42" fill="none" style={style}>
      <circle cx="12" cy="32" r="9" stroke={color} strokeWidth="3" fill="none"/>
      <circle cx="52" cy="32" r="9" stroke={color} strokeWidth="3" fill="none"/>
      <path d="M12 32 L20 16 L32 16 L52 32" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32 16 L32 8 M28 8 L36 8" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M20 16 L28 16" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 64 42" fill="none" style={style}>
      <circle cx="12" cy="32" r="9" stroke={color} strokeWidth="3" fill="none"/>
      <circle cx="52" cy="32" r="9" stroke={color} strokeWidth="3" fill="none"/>
      <path d="M12 32 L18 18 L36 18 L52 32" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 18 L22 10 L42 10 L38 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="28" y1="10" x2="28" y2="18" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

/* ── data ── */
const PARTICLES = [
  { id:1,  icon:"bike",  cls:"findride-p1"  },
  { id:2,  icon:"moto",  cls:"findride-p2"  },
  { id:3,  icon:"bike",  cls:"findride-p3"  },
  { id:4,  icon:"cycle", cls:"findride-p4"  },
  { id:5,  icon:"moto",  cls:"findride-p5"  },
  { id:6,  icon:"bike",  cls:"findride-p6"  },
  { id:7,  icon:"cycle", cls:"findride-p7"  },
  { id:8,  icon:"moto",  cls:"findride-p8"  },
  { id:9,  icon:"bike",  cls:"findride-p9"  },
  { id:10, icon:"cycle", cls:"findride-p10" },
  { id:11, icon:"moto",  cls:"findride-p11" },
  { id:12, icon:"bike",  cls:"findride-p12" },
];

const STATIC_ICONS = [
  { top:"14%", left:"7%",   size:38, color:"#a855f7", type:"moto",  opacity:0.55 },
  { top:"20%", right:"6%",  size:30, color:"#ec4899", type:"bike",  opacity:0.50 },
  { top:"52%", left:"4%",   size:32, color:"#a855f7", type:"cycle", opacity:0.45 },
  { top:"58%", right:"5%",  size:36, color:"#ec4899", type:"moto",  opacity:0.50 },
  { top:"36%", left:"3%",   size:26, color:"#c084fc", type:"bike",  opacity:0.38 },
  { top:"33%", right:"3%",  size:28, color:"#f472b6", type:"cycle", opacity:0.38 },
  { top:"78%", left:"9%",   size:34, color:"#a855f7", type:"moto",  opacity:0.42 },
  { top:"74%", right:"8%",  size:32, color:"#ec4899", type:"bike",  opacity:0.42 },
  { top:"10%", left:"22%",  size:24, color:"#c084fc", type:"cycle", opacity:0.30 },
  { top:"12%", right:"20%", size:26, color:"#f472b6", type:"moto",  opacity:0.30 },
  { top:"86%", left:"28%",  size:22, color:"#a855f7", type:"bike",  opacity:0.28 },
  { top:"83%", right:"26%", size:24, color:"#ec4899", type:"cycle", opacity:0.28 },
];

/* ── all CSS injected as a single string ── */
const CSS = `
  html, body, #root { margin:0; padding:0; min-height:100%; }
  * { box-sizing:border-box; }

  /* burst keyframes — 12 directions from center */
  @keyframes findride-burst1  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(-20deg);opacity:0} 15%{opacity:1} 100%{transform:translate(calc(-50% - 420px),calc(-50% - 260px)) scale(1.1) rotate(-20deg);opacity:0} }
  @keyframes findride-burst2  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(15deg);opacity:0}  15%{opacity:1} 100%{transform:translate(calc(-50% + 380px),calc(-50% - 300px)) scale(1.1) rotate(15deg);opacity:0} }
  @keyframes findride-burst3  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(-40deg);opacity:0} 15%{opacity:1} 100%{transform:translate(calc(-50% - 300px),calc(-50% + 290px)) scale(1.1) rotate(-40deg);opacity:0} }
  @keyframes findride-burst4  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(45deg);opacity:0}  15%{opacity:1} 100%{transform:translate(calc(-50% + 340px),calc(-50% + 270px)) scale(1.1) rotate(45deg);opacity:0} }
  @keyframes findride-burst5  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(-10deg);opacity:0} 15%{opacity:1} 100%{transform:translate(calc(-50% - 160px),calc(-50% - 360px)) scale(1.1) rotate(-10deg);opacity:0} }
  @keyframes findride-burst6  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(25deg);opacity:0}  15%{opacity:1} 100%{transform:translate(calc(-50% + 190px),calc(-50% - 320px)) scale(1.1) rotate(25deg);opacity:0} }
  @keyframes findride-burst7  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(-55deg);opacity:0} 15%{opacity:1} 100%{transform:translate(calc(-50% - 400px),calc(-50% + 160px)) scale(1.1) rotate(-55deg);opacity:0} }
  @keyframes findride-burst8  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(60deg);opacity:0}  15%{opacity:1} 100%{transform:translate(calc(-50% + 420px),calc(-50% + 190px)) scale(1.1) rotate(60deg);opacity:0} }
  @keyframes findride-burst9  { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(-30deg);opacity:0} 15%{opacity:1} 100%{transform:translate(calc(-50% - 220px),calc(-50% + 340px)) scale(1.1) rotate(-30deg);opacity:0} }
  @keyframes findride-burst10 { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(35deg);opacity:0}  15%{opacity:1} 100%{transform:translate(calc(-50% + 260px),calc(-50% + 330px)) scale(1.1) rotate(35deg);opacity:0} }
  @keyframes findride-burst11 { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(-65deg);opacity:0} 15%{opacity:1} 100%{transform:translate(calc(-50% - 460px),calc(-50% - 80px))  scale(1.1) rotate(-65deg);opacity:0} }
  @keyframes findride-burst12 { 0%{transform:translate(-50%,-50%) scale(0.2) rotate(70deg);opacity:0}  15%{opacity:1} 100%{transform:translate(calc(-50% + 460px),calc(-50% - 100px)) scale(1.1) rotate(70deg);opacity:0} }

  @keyframes findride-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
  @keyframes findride-fadein { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }

  /* page */
  .findride-page {
    min-height: 100vh;
    width: 100%;
    background: #0e1b3d;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    overflow: hidden;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding-bottom: 48px;
  }

  /* burst anchor at viewport center */
  .findride-burst {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 0;
  }

  .findride-particle { position:absolute; top:0; left:0; will-change:transform,opacity; }

  .findride-p1  { animation: findride-burst1  3.8s ease-out infinite 0.00s; }
  .findride-p2  { animation: findride-burst2  4.1s ease-out infinite 0.30s; }
  .findride-p3  { animation: findride-burst3  3.6s ease-out infinite 0.60s; }
  .findride-p4  { animation: findride-burst4  4.3s ease-out infinite 0.90s; }
  .findride-p5  { animation: findride-burst5  3.9s ease-out infinite 1.20s; }
  .findride-p6  { animation: findride-burst6  4.0s ease-out infinite 0.15s; }
  .findride-p7  { animation: findride-burst7  3.7s ease-out infinite 0.45s; }
  .findride-p8  { animation: findride-burst8  4.2s ease-out infinite 0.75s; }
  .findride-p9  { animation: findride-burst9  3.5s ease-out infinite 1.05s; }
  .findride-p10 { animation: findride-burst10 4.4s ease-out infinite 1.35s; }
  .findride-p11 { animation: findride-burst11 3.6s ease-out infinite 0.50s; }
  .findride-p12 { animation: findride-burst12 4.0s ease-out infinite 0.85s; }

  /* static scattered icons */
  .findride-static-icons { position:fixed; inset:0; pointer-events:none; z-index:0; }
  .findride-static-icon  { position:absolute; animation:findride-float 4s ease-in-out infinite; }

  /* navbar */
  .findride-nav {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 40px;
    position: relative;
    z-index: 10;
    box-sizing: border-box;
    animation: findride-fadein 0.6s ease both;
  }
  .findride-logo { display:flex; align-items:center; gap:10px; }
  .findride-logo-icon {
    width:40px; height:40px;
    background:#E8C132; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    flex-shrink:0;
  }
  .findride-logo-text { color:#fff; font-size:18px; font-weight:700; letter-spacing:0.3px; }

  .findride-login-btn {
    background:#E8C132; color:#1a1a2e;
    border:none; border-radius:28px;
    padding:10px 28px; font-size:15px; font-weight:700;
    cursor:pointer; transition:background 0.2s, transform 0.15s;
    font-family:inherit;
  }
  .findride-login-btn:hover { background:#d4af20; transform:scale(1.04); }

  /* hero */
  .findride-hero {
    display:flex; flex-direction:column; align-items:center; text-align:center;
    padding:28px 20px 12px;
    position:relative; z-index:10;
    animation:findride-fadein 0.7s ease 0.1s both;
  }
  .findride-headline {
    color:#fff;
    font-size:clamp(26px, 5.5vw, 52px);
    font-weight:800; line-height:1.15;
    margin:0 0 14px; letter-spacing:-0.5px;
  }
  .findride-subhead { color:rgba(255,255,255,0.60); font-size:16px; margin:0 0 28px; }

  /* Find / Post tab */
  .findride-tab-wrap {
    display:flex; align-items:center;
    background:rgba(255,255,255,0.10);
    border-radius:50px; padding:5px; gap:2px;
    margin-bottom:20px;
  }
  .findride-tab {
    padding:11px 52px; border:none; border-radius:50px;
    font-size:16px; font-weight:600; cursor:pointer;
    background:transparent; color:rgba(255,255,255,0.70);
    transition:background 0.22s, color 0.22s, transform 0.15s;
    font-family:inherit;
  }
  .findride-tab--active { background:#E8C132; color:#1a1a2e; transform:scale(1.02); }
  .findride-tab:not(.findride-tab--active):hover { color:#fff; }

  /* search card */
  .findride-card {
    background:#fff; border-radius:20px;
    padding:24px 28px 22px;
    width:90%; max-width:800px;
    position:relative; z-index:10;
    box-shadow:0 12px 48px rgba(0,0,0,0.30);
    animation:findride-fadein 0.7s ease 0.2s both;
  }

  /* Car / Bike toggle */
  .findride-vehicle-row { display:flex; justify-content:center; gap:10px; margin-bottom:20px; }
  .findride-vehicle-btn {
    display:flex; align-items:center; gap:8px;
    padding:9px 26px; border-radius:30px;
    font-size:14px; font-weight:600;
    border:none; cursor:pointer;
    background:#f1f3f8; color:#6b7280;
    transition:background 0.2s, color 0.2s, transform 0.15s;
    font-family:inherit;
  }
  .findride-vehicle-btn--active { background:#E8C132; color:#1a1a2e; }
  .findride-vehicle-btn:not(.findride-vehicle-btn--active):hover { background:#e5e7eb; }
  .findride-vehicle-btn--active:hover { background:#d4af20; }

  /* inputs row */
  .findride-inputs-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .findride-input-wrap { flex:1; min-width:120px; position:relative; display:flex; align-items:center; }
  .findride-input-icon { position:absolute; left:12px; flex-shrink:0; pointer-events:none; }
  .findride-input {
    width:100%; border:1.5px solid #e5e7eb; border-radius:10px;
    padding:13px 14px 13px 36px;
    font-size:14px; color:#111827; outline:none;
    background:#fff; font-family:inherit;
    transition:border-color 0.18s;
  }
  .findride-input:focus { border-color:#E8C132; box-shadow:0 0 0 3px rgba(232,193,50,0.15); }
  .findride-input::placeholder { color:#b0b8c9; }
  .findride-input--date { color-scheme:light; cursor:pointer; }
  .findride-input--date::-webkit-calendar-picker-indicator { opacity:0.5; cursor:pointer; }

  /* Find Ride button */
  .findride-search-btn {
    display:flex; align-items:center; gap:8px;
    padding:13px 28px;
    background:#E8C132; color:#1a1a2e;
    border:none; border-radius:10px;
    font-size:15px; font-weight:700; cursor:pointer;
    white-space:nowrap;
    transition:background 0.2s, transform 0.15s;
    font-family:inherit; flex-shrink:0;
  }
  .findride-search-btn:hover  { background:#d4af20; transform:scale(1.03); }
  .findride-search-btn:active { transform:scale(0.98); }

  /* footer */
  .findride-footer-hint {
    margin-top:22px; font-size:13px;
    color:rgba(255,255,255,0.30);
    text-align:center; position:relative; z-index:10;
  }

  /* responsive */
  @media (max-width:620px) {
    .findride-nav    { padding:14px 18px; }
    .findride-card   { padding:18px 14px 16px; border-radius:14px; }
    .findride-tab    { padding:10px 30px; font-size:14px; }
    .findride-inputs-row  { flex-direction:column; }
    .findride-input-wrap  { width:100%; }
    .findride-search-btn  { width:100%; justify-content:center; }
    .findride-headline    { font-size:clamp(22px,8vw,34px); }
  }
`;

export default function FindRide() {
  const navigate = useNavigate();
  const [tab, setTab]         = useState("find");
  const [vehicle, setVehicle] = useState("car");
  const [from, setFrom]       = useState("");
  const [to, setTo]           = useState("");
  const [date, setDate]       = useState("");
  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <style>{CSS}</style>

      <div className="findride-page">

        {/* animated particles bursting from center */}
        <div className="findride-burst" aria-hidden="true">
          {PARTICLES.map(p => (
            <div key={p.id} className={`findride-particle ${p.cls}`}>
              <VehicleIcon
                type={p.icon}
                size={p.id % 3 === 0 ? 36 : p.id % 2 === 0 ? 28 : 32}
                color={p.id % 2 === 0 ? "#a855f7" : "#ec4899"}
              />
            </div>
          ))}
        </div>

        {/* static scattered icons with float */}
        <div className="findride-static-icons" aria-hidden="true">
          {STATIC_ICONS.map((ic, i) => (
            <div
              key={i}
              className="findride-static-icon"
              style={{
                top: ic.top,
                left: ic.left,
                right: ic.right,
                opacity: ic.opacity,
                animationDelay: `${i * 0.35}s`,
              }}
            >
              <VehicleIcon type={ic.type} size={ic.size} color={ic.color} />
            </div>
          ))}
        </div>

        {/* navbar */}
        <nav className="findride-nav">
          <div className="findride-logo">
            <div className="findride-logo-icon">
              <svg width="22" height="22" viewBox="0 0 64 42" fill="none">
                <circle cx="12" cy="32" r="9" stroke="#1a1a2e" strokeWidth="3.5" fill="none"/>
                <circle cx="52" cy="32" r="9" stroke="#1a1a2e" strokeWidth="3.5" fill="none"/>
                <path d="M12 32 L22 16 L38 16 L44 24 L52 24" stroke="#1a1a2e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M34 16 L40 8 L50 8" stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="findride-logo-text">Travel Mate</span>
          </div>
          <button className="findride-login-btn" onClick={() => navigate("/")}>
            Login
          </button>
        </nav>

        {/* hero */}
        <div className="findride-hero">
          <h1 className="findride-headline">
            Travel Together.<br />Save More.
          </h1>
          <p className="findride-subhead">Find or share rides easily across cities</p>

          <div className="findride-tab-wrap">
            <button
              className={`findride-tab ${tab === "find" ? "findride-tab--active" : ""}`}
              onClick={() => setTab("find")}
            >
              Find
            </button>
            <button
              className={`findride-tab ${tab === "post" ? "findride-tab--active" : ""}`}
              onClick={() => setTab("post")}
            >
              Post
            </button>
          </div>
        </div>

        {/* search card */}
        <div className="findride-card">

          {/* Car / Bike toggle */}
          <div className="findride-vehicle-row">
            <button
              className={`findride-vehicle-btn ${vehicle === "car" ? "findride-vehicle-btn--active" : ""}`}
              onClick={() => setVehicle("car")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 11l1.5-4.5h11L19 11M3 17a1 1 0 1 0 2 0 1 1 0 0 0-2 0m16 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0M1 17v-3l2-6h18l2 6v3H1z"/>
              </svg>
              Car
            </button>
            <button
              className={`findride-vehicle-btn ${vehicle === "bike" ? "findride-vehicle-btn--active" : ""}`}
              onClick={() => setVehicle("bike")}
            >
              <svg width="18" height="18" viewBox="0 0 64 42" fill="none">
                <circle cx="12" cy="32" r="9" stroke="currentColor" strokeWidth="4" fill="none"/>
                <circle cx="52" cy="32" r="9" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path d="M12 32 L20 16 L32 16 L52 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M32 16 L32 8 M28 8 L36 8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
              Bike
            </button>
          </div>

          {/* inputs */}
          <div className="findride-inputs-row">

            <div className="findride-input-wrap">
              <svg className="findride-input-icon" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="#E8C132" strokeWidth="2.2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <input
                className="findride-input"
                type="text"
                placeholder="From"
                value={from}
                onChange={e => setFrom(e.target.value)}
              />
            </div>

            <div className="findride-input-wrap">
              <svg className="findride-input-icon" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="#E8C132" strokeWidth="2.2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <input
                className="findride-input"
                type="text"
                placeholder="To"
                value={to}
                onChange={e => setTo(e.target.value)}
              />
            </div>

            <div className="findride-input-wrap">
              <svg className="findride-input-icon" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="#E8C132" strokeWidth="2.2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <input
                className="findride-input findride-input--date"
                type="date"
                min={today}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            <button className="findride-search-btn">
              <svg width="17" height="17" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Find Ride
            </button>
          </div>
        </div>

        <p className="findride-footer-hint">🌍 Connecting travellers across India</p>
      </div>
    </>
  );
}
