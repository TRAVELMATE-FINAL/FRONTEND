import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  getPlans, applyCoupon, createPlanOrder, verifyPlanPayment,
} from "../services/api";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const API_BASE = import.meta.env.VITE_APP_URL || "http://localhost:5000";

// Pull the stashed ride payload (if any), POST it to /api/rides, and
// return the new ride id. Called immediately after payment is verified
// so the ride only enters MongoDB once the user has actually paid.
async function publishPendingRide() {
  let raw;
  try { raw = localStorage.getItem("pendingRidePayload"); } catch { raw = null; }
  if (!raw) return "";

  let payload;
  try { payload = JSON.parse(raw); } catch { return ""; }
  if (!payload || !payload.from || !payload.to) return "";

  try {
    const res = await axios.post(`${API_BASE}/api/rides`, payload);
    const newId = res.data?.data?._id || res.data?.data?.id || "";
    if (newId) {
      try {
        localStorage.setItem("lastPostedRideId", newId);
        localStorage.removeItem("pendingRidePayload");
      } catch {}
    }
    console.log("✅ Ride published after payment:", newId);
    return newId;
  } catch (err) {
    console.error("❌ Failed to publish ride after payment:", err);
    return "";
  }
}

// ── Razorpay checkout script loader ──
let rzpScriptPromise = null;
const loadRazorpay = () => {
  if (rzpScriptPromise) return rzpScriptPromise;
  rzpScriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.head.appendChild(s);
  });
  return rzpScriptPromise;
};

// Processing fee added to every plan
const PROCESSING_FEE = 1;

export default function SecurePayment() {
  const navigate = useNavigate();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Plan key from localStorage (set by Chooseyourplan.jsx)
  const [planKey] = useState(() => localStorage.getItem("chosenPlan") || "daily");
  const [planMeta, setPlanMeta] = useState(null);    // { name, price, durationDays, ... }

  // Coupon state
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, cashback, finalAmount }
  const [couponMsg, setCouponMsg] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // Payment method UI state (visual only — Razorpay handles routing)
  const [selectedMethod, setSelectedMethod] = useState("upi");

  // Status
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch plan meta (price, duration) from backend
  useEffect(() => {
    (async () => {
      try {
        const r = await getPlans();
        const found = (r.plans || []).find((p) => p.key === planKey);
        if (found) setPlanMeta(found);
      } catch (e) {
        setErrMsg("Could not load plan details");
      }
    })();
  }, [planKey]);

  // Pre-load the Razorpay script as soon as the page mounts
  useEffect(() => {
    loadRazorpay().catch(() => {});
  }, []);

  // Fetch the live list of available coupons (so users can tap to apply)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const baseURL = (import.meta.env.VITE_APP_URL || "http://localhost:5000") + "/api";
        const r = await fetch(baseURL + "/plans/coupon/list?plan=" + encodeURIComponent(planKey));
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && Array.isArray(data?.coupons)) setAvailableCoupons(data.coupons);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [planKey]);

  // Tap a coupon chip → fill the input + immediately apply it
  const applyCouponDirect = async (code) => {
    setCoupon(code);
    setCouponMsg("");
    setErrMsg("");
    try {
      const r = await applyCoupon({ code, plan: planKey });
      setAppliedCoupon({ code: r.code, cashback: r.cashback, finalAmount: r.finalAmount });
      setCouponMsg("✅ " + r.code + " applied — you save ₹" + r.cashback);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponMsg(
        "❌ " + (err?.response?.data?.message || err.message || "Could not apply coupon")
      );
    }
  };

  // ── Pricing breakdown ──
  const baseFee = planMeta?.price ?? 0;
  const cashback = appliedCoupon?.cashback ?? 0;
  const subtotal = Math.max(0, baseFee - cashback);
  const total = subtotal + PROCESSING_FEE;

  // ── Coupon apply ──
  const handleApplyCoupon = async () => {
    setCouponMsg("");
    setErrMsg("");
    if (!coupon.trim()) {
      setCouponMsg("Enter a coupon code");
      return;
    }
    if (!planKey) {
      setErrMsg("No plan selected");
      return;
    }
    try {
      const r = await applyCoupon({ code: coupon.trim().toUpperCase(), plan: planKey });
      setAppliedCoupon({
        code: r.code,
        cashback: r.cashback,
        finalAmount: r.finalAmount,
      });
      setCouponMsg("✅ " + r.code + " applied — you save ₹" + r.cashback);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponMsg(
        "❌ " +
          (err?.response?.data?.message || err.message || "Could not apply coupon")
      );
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCoupon("");
    setCouponMsg("");
  };

  // ── Pay ──
  const handlePay = async () => {
    setErrMsg("");
    setSuccessMsg("");

    if (!planKey || !planMeta) {
      setErrMsg("Plan not selected");
      return;
    }

    setLoading(true);
    try {
      // 1) Server creates a Razorpay order
      const order = await createPlanOrder({
        plan: planKey,
        couponCode: appliedCoupon?.code || "",
      });

      // 2) Open Razorpay checkout
      await loadRazorpay();
      const phone = localStorage.getItem("phone") || "";
      const email = localStorage.getItem("email") || "";

      const rzp = new window.Razorpay({
        key: order.key,
        amount: order.amount,         // paise
        currency: order.currency,
        order_id: order.orderId,
        name: "TravelMate",
        description: planMeta.name + " — " + planMeta.feature,
        prefill: { contact: phone.replace(/^\+91/, ""), email },
        theme: { color: "#0d1b2a" },
        handler: async (response) => {
          try {
            const v = await verifyPlanPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
              couponCode: appliedCoupon?.code || "",
            });

            // ⏬ NEW — publish the stashed ride payload now that payment
            // has cleared. This is what makes the ride actually appear
            // in the database and on the Find Friend feed.
            setSuccessMsg("✅ Payment verified — publishing your ride…");
            const publishedId = await publishPendingRide();

            setSuccessMsg(
              publishedId
                ? "✅ Payment verified & ride published! Subscription active until " +
                    new Date(v.subscription.endDate).toLocaleDateString() + "."
                : "✅ Payment verified! Subscription active until " +
                    new Date(v.subscription.endDate).toLocaleDateString() + "."
            );
            localStorage.removeItem("chosenPlan");

            // After payment success → land on the populated Ride
            // Detail page (driver profile + vehicle + route + contact).
            // Prefer the freshly-published rideId, fall back to:
            //   1) pendingUnlockRideId (user came via Unlock Contact)
            //   2) lastPostedRideId    (a previous post in this session)
            //   3) no id → /ride-live's generic success card
            setTimeout(() => {
              const pendingUnlockRideId = localStorage.getItem("pendingUnlockRideId");
              const lastPostedRideId    = localStorage.getItem("lastPostedRideId");
              const rideId = publishedId || pendingUnlockRideId || lastPostedRideId || "";

              // The breadcrumb has done its job — clean up so future
              // navigations don't loop back through the unlock chain.
              if (pendingUnlockRideId) localStorage.removeItem("pendingUnlockRideId");

              navigate(rideId ? ("/ride-detail?rideId=" + rideId) : "/ride-live");
            }, 1500);
          } catch (e) {
            setErrMsg(
              "Verification failed: " +
                (e?.response?.data?.message || e.message)
            );
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.on("payment.failed", (resp) => {
        setErrMsg("Payment failed: " + (resp.error?.description || "Try again"));
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setErrMsg(
        err?.response?.data?.message || err.message || "Could not start payment"
      );
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eef0f4",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <Header />
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}>
      <div
        className="secure-payment-card"
        style={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
          background: "#fff",
        }}
      >
        {/* Header */}
        <div style={{ background: "#0d1b2a", padding: "26px 24px", textAlign: "center" }}>
          <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 600, margin: 0 }}>
            Secure payment
          </h2>
          {planMeta && (
            <div style={{ color: "#9fb1c7", fontSize: 12.5, marginTop: 4 }}>
              {planMeta.name} • ₹{planMeta.price} • {planMeta.durationDays} day(s)
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px 24px" }}>

          {/* Coupon */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 13, color: "#444", fontWeight: 500, display: "block", marginBottom: 8 }}>
              Enter coupon code
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                placeholder="Try WELCOME10, TRAVEL50…"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                disabled={!!appliedCoupon}
                style={{
                  flex: 1, border: "1px solid #ddd", borderRadius: 8,
                  padding: "11px 14px", fontSize: 14, color: "#333", outline: "none",
                  background: appliedCoupon ? "#f0f0f0" : "#fafafa",
                  textTransform: "uppercase",
                }}
              />
              {appliedCoupon ? (
                <button
                  onClick={removeCoupon}
                  style={{
                    background: "#fff", color: "#dc2626",
                    border: "1px solid #dc2626", borderRadius: 8,
                    padding: "11px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={handleApplyCoupon}
                  style={{
                    background: "#0d1b2a", color: "#fff", border: "none",
                    borderRadius: 8, padding: "11px 20px",
                    fontWeight: 600, fontSize: 14, cursor: "pointer",
                  }}
                >
                  Apply
                </button>
              )}
            </div>
            {couponMsg && (
              <div style={{
                fontSize: 12.5, marginTop: 8,
                color: appliedCoupon ? "#16a34a" : "#dc2626",
              }}>
                {couponMsg}
              </div>
            )}

            {/* Tap-to-apply coupon chips were removed from the UI
                per request. Users can still type a code into the
                input above and click Apply. */}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 18px" }} />

          {/* Payment summary */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 12 }}>
              Payment Summary
            </div>

            <Row label={planMeta?.name || "Plan Fee"} value={"₹" + baseFee} />
            {appliedCoupon && (
              <Row
                label={"Cashback (" + appliedCoupon.code + ")"}
                value={"− ₹" + cashback}
                color="#16a34a"
              />
            )}
            <Row label="Processing Fee" value={"₹" + PROCESSING_FEE} />

            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderTop: "1.5px dashed #ccc", borderBottom: "1.5px dashed #ccc",
              padding: "12px 0", marginTop: 8,
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 22, color: "#2ecc8e" }}>
                ₹{total}
              </span>
            </div>
          </div>

          {/* Payment method (visual cue only — Razorpay handles the actual flow) */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111", marginBottom: 12 }}>
              Select Payment Method
            </div>
            {[
              { key: "upi",  title: "UPI",                 sub: "Google Pay, PhonePe, Paytm" },
              { key: "card", title: "Credit / Debit Card", sub: "Visa, Mastercard, RuPay" },
              { key: "nb",   title: "Net Banking",         sub: "All major banks" },
            ].map((m) => {
              const sel = selectedMethod === m.key;
              return (
                <div
                  key={m.key}
                  onClick={() => setSelectedMethod(m.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    border: "1.5px solid " + (sel ? "#2ecc8e" : "#eee"),
                    borderRadius: 10, padding: "12px 14px", marginBottom: 8,
                    cursor: "pointer",
                    background: sel ? "#f4fdf9" : "#fff",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{m.sub}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: "2px solid " + (sel ? "#2ecc8e" : "#ccc"),
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {sel && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#2ecc8e" }} />}
                  </div>
                </div>
              );
            })}
          </div>

          {errMsg && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              color: "#b91c1c", padding: "10px 14px", borderRadius: 8,
              fontSize: 13, marginBottom: 12, fontWeight: 500,
            }}>{errMsg}</div>
          )}
          {successMsg && (
            <div style={{
              background: "#ecfdf5", border: "1px solid #a7f3d0",
              color: "#065f46", padding: "10px 14px", borderRadius: 8,
              fontSize: 13.5, marginBottom: 12, fontWeight: 600,
            }}>{successMsg}</div>
          )}

          <button
            onClick={handlePay}
            disabled={loading || !planMeta}
            style={{
              width: "100%", background: loading || !planMeta ? "#fce8a3" : "#f5c518",
              color: "#222", border: "none", borderRadius: 10,
              padding: "14px", fontWeight: 700, fontSize: 16,
              cursor: loading || !planMeta ? "not-allowed" : "pointer",
              marginBottom: 14, letterSpacing: "0.2px",
            }}
          >
            {loading ? "Processing..." : "Pay Rs." + total + " & Activate Plan"}
          </button>

          <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, color: "#888" }}>
            <span>🔒 Secure Payment</span>
            <span>🛡️ Encrypted</span>
          </div>
        </div>
      </div>
      </div>

      <Footer />
    </div>
  );
}

function Row({ label, value, color = "#444" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color, marginBottom: 8 }}>
      <span>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
