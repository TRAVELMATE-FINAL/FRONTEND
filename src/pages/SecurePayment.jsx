import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPlans, applyCoupon, createPlanOrder, verifyPlanPayment,
} from "../services/api";

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
            setSuccessMsg("✅ Payment verified! Subscription active until " +
              new Date(v.subscription.endDate).toLocaleDateString() + ".");
            localStorage.removeItem("chosenPlan");

            // After payment success → land on RideLive showing the ride that
            // was just published (or any pending-unlock ride if there was one).
            setTimeout(() => {
              const pendingUnlockRideId = localStorage.getItem("pendingUnlockRideId");
              const lastPostedRideId = localStorage.getItem("lastPostedRideId");
              if (pendingUnlockRideId) {
                localStorage.removeItem("pendingUnlockRideId");
                navigate("/connect-unlock?rideId=" + pendingUnlockRideId);
              } else if (lastPostedRideId) {
                navigate("/ride-live?rideId=" + lastPostedRideId);
              } else {
                navigate("/ride-live");
              }
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
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        padding: "32px 16px",
      }}
    >
      <div
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

            {/* Available coupons — tap a chip to auto-apply */}
            {availableCoupons.length > 0 && !appliedCoupon && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: "#666", fontWeight: 600, marginBottom: 8 }}>
                  Available coupons (tap to apply):
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {availableCoupons.map((c) => {
                    const cashbackText =
                      c.type === "percent"
                        ? c.value + "% off" + (c.maxCashback ? " (max ₹" + c.maxCashback + ")" : "")
                        : "₹" + c.value + " off";
                    const days = Math.max(0, Math.ceil((new Date(c.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => applyCouponDirect(c.code)}
                        title={"Expires in " + days + " day(s)"}
                        style={{
                          background: "#fff7e6",
                          border: "1px dashed #f5c518",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#0d1b2a",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          minWidth: 130,
                        }}
                      >
                        <span style={{ fontWeight: 800, color: "#b8860b" }}>{c.code}</span>
                        <span style={{ fontSize: 11, color: "#555", fontWeight: 500 }}>
                          {cashbackText}
                        </span>
                        <span style={{ fontSize: 10, color: "#999" }}>
                          Expires in {days}d
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
