import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

const PLAN_LABEL = { daily: "Daily", monthly: "Monthly", yearly: "Yearly" };
const PURPOSE_LABEL = { post: "Post Ride", find: "Find Ride" };

const STATUS_STYLE = {
  active:    { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", label: "Active" },
  expired:   { bg: "#fee2e2", color: "#991b1b", border: "#fecaca", label: "Expired" },
  pending:   { bg: "#fef9c3", color: "#854d0e", border: "#fde68a", label: "Pending" },
  cancelled: { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb", label: "Cancelled" },
};

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function StatusChip({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.expired;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 800,
      padding: "4px 12px", borderRadius: 999,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{s.label}</span>
  );
}

function PlanCard({ p, featured }) {
  return (
    <div style={{
      background: featured ? "#1a1a4e" : "#fff",
      color: featured ? "#fff" : "#1a1a2e",
      border: featured ? "none" : "1px solid #eef0f4",
      borderRadius: 16,
      padding: "18px 20px",
      boxShadow: featured ? "0 14px 34px rgba(26,26,78,0.28)" : "0 6px 20px rgba(15,15,46,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.2px" }}>
            {PLAN_LABEL[p.plan] || p.plan} Plan
          </div>
          <div style={{ fontSize: 12, color: featured ? "#c5c7e0" : "#6b7280", marginTop: 2 }}>
            {PURPOSE_LABEL[p.purpose] || p.purpose}
          </div>
        </div>
        <StatusChip status={p.status} />
      </div>

      <div style={{ fontSize: 22, fontWeight: 800, color: featured ? "#ffcb05" : "#1a1a2e", marginBottom: 12 }}>
        ₹{Number(p.amountPaid ?? p.originalAmount ?? 0)}
        {p.couponCode ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: featured ? "#c5c7e0" : "#6b7280", marginLeft: 8 }}>
            ({p.couponCode} applied)
          </span>
        ) : null}
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px 18px",
        fontSize: 13, color: featured ? "#d6dafc" : "#4b5563",
        borderTop: `1px solid ${featured ? "rgba(255,255,255,0.12)" : "#f3f4f6"}`, paddingTop: 12,
      }}>
        <div><div style={{ fontSize: 11, opacity: 0.8 }}>Purchased</div><div style={{ fontWeight: 700 }}>{fmtDate(p.purchaseDate)}</div></div>
        <div><div style={{ fontSize: 11, opacity: 0.8 }}>Starts</div><div style={{ fontWeight: 700 }}>{fmtDate(p.startDate)}</div></div>
        <div><div style={{ fontSize: 11, opacity: 0.8 }}>Expires</div><div style={{ fontWeight: 700 }}>{fmtDate(p.endDate)}</div></div>
      </div>
    </div>
  );
}

export default function MyPlans() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const phone = (typeof window !== "undefined" && localStorage.getItem("phone")) || "";
    if (!phone) { navigate("/login"); return; }
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/plans/my`, { params: { phone }, timeout: 8000 })
      .then(({ data }) => {
        if (cancelled) return;
        setPlans(Array.isArray(data?.data) ? data.data : []);
        setActive(data?.active || null);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.message || "Could not load your plans. Please try again.");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [navigate]);

  // History = everything except the active one shown on top.
  const history = active ? plans.filter((p) => String(p._id) !== String(active._id)) : plans;

  return (
    <div style={{ minHeight: "100vh", background: "var(--tm-internal-bg)", display: "flex", flexDirection: "column" }}>
      <Header />
      <main style={{ flex: 1, width: "100%", maxWidth: 820, margin: "0 auto", padding: "26px clamp(14px,4vw,40px) 60px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.3px", margin: "0 0 4px" }}>My Plans</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 22px" }}>Your current plan and purchase history.</p>

        {loading && <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>Loading your plans…</div>}

        {!loading && error && (
          <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 12, padding: 16, textAlign: "center" }}>
            {error}
          </div>
        )}

        {!loading && !error && plans.length === 0 && (
          <div style={{
            background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 16,
            padding: "44px 24px", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, margin: "0 auto 14px", borderRadius: "50%",
              background: "#f3effe", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>No active plan</div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 18 }}>Explore our available plans to start posting rides.</div>
            <button type="button" onClick={() => navigate("/plan")} style={{
              background: "#f5c518", color: "#111", border: "none", borderRadius: 999,
              padding: "12px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer",
              boxShadow: "0 8px 20px rgba(245,197,24,0.32)",
            }}>
              Explore plans →
            </button>
          </div>
        )}

        {!loading && !error && plans.length > 0 && (
          <>
            {active && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Current plan</div>
                <PlanCard p={active} featured />
              </div>
            )}

            {history.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {active ? "Plan history" : "Your plans"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {history.map((p) => <PlanCard key={p._id} p={p} />)}
                </div>
              </>
            )}

            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button type="button" onClick={() => navigate("/plan")} style={{
                background: "transparent", color: "#7c3aed", border: "1px solid #d8c9fb", borderRadius: 999,
                padding: "11px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
                {active ? "Renew or buy another plan" : "Explore plans"} →
              </button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
