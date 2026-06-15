import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  getPlans, applyCoupon, createPlanOrder, verifyPlanPayment,
} from "../services/api";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

// Publish the stashed ride payload to /api/rides AFTER payment succeeds.
// IMPORTANT: when a not-logged-in user clicked "Publish Ride", the stashed
// payload's `userPhone` was empty. So at publish time we re-stamp `userPhone`
// from localStorage (which is now populated after OTP verify) — otherwise
// the published ride wouldn't show up on the user's profile.
async function publishPendingRide() {
  let raw;
  try { raw = localStorage.getItem("pendingRidePayload"); } catch { raw = null; }
  if (!raw) return { ok: true, id: "" };
  let payload;
  try { payload = JSON.parse(raw); } catch { return { ok: true, id: "" }; }
  if (!payload || !payload.from || !payload.to) return { ok: true, id: "" };

  // Re-stamp userPhone from the freshly-authenticated user.
  const phoneNow = (typeof localStorage !== "undefined" && localStorage.getItem("phone")) || "";
  if (phoneNow) payload.userPhone = phoneNow;

  try {
    const res = await axios.post(`${API_BASE}/api/rides`, payload);
    const newId = res.data?.data?._id || res.data?.data?.id || "";
    if (newId) {
      try {
        localStorage.setItem("lastPostedRideId", newId);
        localStorage.removeItem("pendingRidePayload");
      } catch {}
    }
    return { ok: true, id: newId };
  } catch (err) {
    // Surface the real backend reason so silent 400s (e.g. missing
    // required field) become visible instead of "payment ok, ride gone".
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Could not publish trip";
    console.error("Failed to publish trip:", msg, err?.response?.data || err);
    return { ok: false, id: "", error: msg };
  }
}

// Razorpay script loader — idempotent, pre-loaded on mount for speed.
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

const PROCESSING_FEE = 0; // ₹0 — not counted in total

export default function SecurePayment() {
  const navigate = useNavigate();

  useLayoutEffect(() => { window.scrollTo(0, 0); }, []);

  const [planKey]  = useState(() => localStorage.getItem("chosenPlan") || "daily");
  const [planMeta, setPlanMeta] = useState(null);

  // Coupon states
  const [coupon,          setCoupon]          = useState("");
  const [couponChecking,  setCouponChecking]  = useState(false);
  // couponAttempted = true after any apply attempt (success or fail)
  // Controls whether to show "Clear" button instead of "Apply"
  const [couponAttempted, setCouponAttempted] = useState(false);
  // Coupon-specific messages shown ONLY inside the coupon section
  const [couponMsg,       setCouponMsg]       = useState({ type: "", text: "" });
  const [discountAmt,     setDiscountAmt]     = useState(0);
  const [discountedAmt,   setDiscountedAmt]   = useState(null);

  // Payment
  const [selectedMethod, setSelectedMethod] = useState("");
  const [loading,        setLoading]        = useState(false);
  // Payment-level error shown above Pay button only
  const [payErrMsg,      setPayErrMsg]      = useState("");
  const [successMsg,     setSuccessMsg]     = useState("");

  // Load plan details + pre-load Razorpay on mount for speed
  useEffect(() => {
    (async () => {
      try {
        const r = await getPlans();
        const found = (r.plans || []).find((p) => p.key === planKey);
        if (found) {
          setPlanMeta(found);
          setDiscountedAmt(found.price);
        }
      } catch {
        setPayErrMsg("Could not load plan details");
      }
    })();
    // Pre-load Razorpay in background so Pay button is instant
    loadRazorpay().catch(() => {});
  }, [planKey]);

  // Pricing
  const baseFee = planMeta?.price ?? 0;
  const total   = Math.max(0, discountedAmt ?? baseFee);

  // ── Apply coupon ──
  const handleApplyCoupon = async () => {
    setCouponMsg({ type: "", text: "" });
    const c = coupon.trim();
    if (!c) {
      setCouponMsg({ type: "error", text: "Please enter a coupon code." });
      return;
    }
    setCouponChecking(true);
    try {
      const r = await applyCoupon({ code: c.toUpperCase(), plan: planKey });
      const amt = Number(r.discountAmount ?? r.cashback ?? r.amount ?? 0);
      if (r.isActive !== false && amt > 0) {
        // Valid coupon
        setDiscountAmt(amt);
        setDiscountedAmt(Math.max(0, baseFee - amt));
        setCouponMsg({
          type: "success",
          text: `Coupon Applied — Discount Amount ₹${amt}`,
        });
      } else {
        setDiscountAmt(0);
        setDiscountedAmt(baseFee);
        setCouponMsg({ type: "error", text: "Coupon Code is Invalid" });
      }
      setCouponAttempted(true); // show Clear button after any attempt
    } catch (err) {
      setDiscountAmt(0);
      setDiscountedAmt(baseFee);
      setCouponMsg({ type: "error", text: "Coupon Code is Invalid" });
      setCouponAttempted(true); // show Clear button after any attempt
    } finally {
      setCouponChecking(false);
    }
  };

  // Clear coupon — reset everything back to initial state
  const handleClearCoupon = () => {
    setCoupon("");
    setDiscountAmt(0);
    setDiscountedAmt(baseFee);
    setCouponMsg({ type: "", text: "" });
    setCouponAttempted(false); // revert to "Apply" button
  };

  // ── Pay ──
  const handlePay = async () => {
    setPayErrMsg("");
    setSuccessMsg("");
    if (!planKey || !planMeta) { setPayErrMsg("Plan not selected"); return; }
    if (!selectedMethod) { setPayErrMsg("Please select a payment method."); return; }
    setLoading(true);
    let orderId = null;
    try {
      // Pass frontend-computed total (in paise) so backend amount matches screen
      const order = await createPlanOrder({
        plan:       planKey,
        couponCode: discountAmt > 0 ? coupon.trim().toUpperCase() : "",
        method:     selectedMethod,
        amount:     total * 100,
      });
      orderId = order.orderId;
      // Razorpay was pre-loaded on mount — resolves instantly
      await loadRazorpay();
      const phone = localStorage.getItem("phone") || "";
      const email = localStorage.getItem("email") || "";

      const rzp = new window.Razorpay({
        key:      order.key,
        amount:   order.amount,
        currency: order.currency || "INR",
        order_id: order.orderId,
        name:     "TravelMate",
        description: planMeta.name + " — " + (planMeta.feature || ""),
        prefill:  { contact: phone.replace(/^\+91/, ""), email },
        theme:    { color: "#0d1b2a" },

        handler: async (response) => {
          try {
            const v = await verifyPlanPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan:       planKey,
              couponCode: discountAmt > 0 ? coupon.trim().toUpperCase() : "",
              method:     selectedMethod,
            });

            // Persist subscription proof so RideDetail can reveal the
            // contact instantly without waiting for /api/plans/me to commit.
            try {
              if (v?.subscription?.endDate) {
                localStorage.setItem("subEndDate", v.subscription.endDate);
              }
            } catch (_e) {}

            // Fire payment notification (non-blocking)
            const userPhone = localStorage.getItem("phone") || "";
            axios.post(`${API_BASE}/api/notifications`, {
              userPhone,
              type: "payment",
              title: "Payment successful",
              body: `Your ${planMeta?.name || "plan"} subscription is now active.`,
            }).catch(() => {});

            setSuccessMsg("✅ Payment verified — publishing your trip…");
            const publishResult = await publishPendingRide();
            const publishedId = publishResult.id || "";

            // If a publish was attempted (pendingPostRide flag is set) and
            // the backend rejected it, surface the real reason so we don't
            // silently lose the ride.
            const pendingPostRideFlag = localStorage.getItem("pendingPostRide");
            if (pendingPostRideFlag && !publishResult.ok) {
              setPayErrMsg(
                "Payment succeeded, but your trip could not be published: " +
                  (publishResult.error || "unknown error") +
                  ". Please contact support — your subscription is still active."
              );
              setLoading(false);
              return;
            }

            // Fire ride-published notification (non-blocking)
            if (publishedId) {
              axios.post(`${API_BASE}/api/notifications`, {
                userPhone,
                type: "ride",
                title: "Trip published successfully",
                body: "Your trip is now live and visible to other travellers.",
                action: { to: `/ride-detail?rideId=${publishedId}` },
              }).catch(() => {});
            }

            setSuccessMsg(
              publishedId
                ? "✅ Payment verified & trip published! Subscription active until " +
                    new Date(v.subscription.endDate).toLocaleDateString() + "."
                : "✅ Payment verified! Subscription active until " +
                    new Date(v.subscription.endDate).toLocaleDateString() + "."
            );
            localStorage.removeItem("chosenPlan");

            // Navigate — no artificial delay
            const pendingPostRide     = localStorage.getItem("pendingPostRide");
            const pendingUnlockRideId = localStorage.getItem("pendingUnlockRideId");
            const lastPostedRideId    = localStorage.getItem("lastPostedRideId");
            const rideId = publishedId || pendingUnlockRideId || lastPostedRideId || "";
            if (pendingUnlockRideId) localStorage.removeItem("pendingUnlockRideId");
            if (pendingPostRide)     localStorage.removeItem("pendingPostRide");
            if (pendingPostRide) {
              navigate(rideId ? "/ride-live?rideId=" + rideId : "/ride-live");
            } else if (rideId) {
              navigate("/ride-detail?rideId=" + rideId);
            } else {
              navigate("/ride-live");
            }
          } catch (e) {
            setPayErrMsg("Verification failed: " + (e?.response?.data?.message || e.message));
            setLoading(false);
          }
        },

        modal: {
          ondismiss: async () => {
            if (orderId) {
              axios.post(`${API_BASE}/api/payment/cancel-order`, { orderId }).catch(() => {});
            }
            setPayErrMsg("Payment cancelled.");
            setLoading(false);
          },
        },
      });

      rzp.on("payment.failed", (resp) => {
        setPayErrMsg("Payment failed: " + (resp.error?.description || "Try again"));
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      setPayErrMsg(err?.response?.data?.message || err.message || "Could not start payment");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#eef0f4",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    }}>
      <Header />

      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 500,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          background: "#fff",
        }}>

          {/* ── Dark Header — matches UnlockContact exactly ── */}
          <div style={{
            background: "linear-gradient(135deg, #0d1b2a 0%, #161f35 100%)",
            padding: "30px 28px 26px",
            textAlign: "center",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 8,
            }}>
              {/* Lock icon */}
              {/* <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="10" width="16" height="12" rx="2.5" stroke="#fff" strokeWidth="1.8" />
                <path d="M8 10V7a4 4 0 018 0v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1.5" fill="#fff" />
              </svg> */}
              <h2 style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 600,
                margin: 0,
                letterSpacing: "-0.3px",
              }}>
                Secure Payment
              </h2>
            </div>
            {/* <p style={{ color: "#FFFFFF", fontSize: 13, margin: 0, fontWeight: 400, fontFamily: "inter" }}>
              Secure payment to access driver contact details
            </p> */}
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "24px 24px 28px" }}>

            {/* Coupon Code */}
            <div style={{
              background: "#f9fafc",
              border: "1px solid #e8eaf0",
              borderRadius: 12,
              padding: "16px 16px 14px",
              marginBottom: 22,
            }}>
              <label style={{
                fontSize: 11,
                color: "#131313",
                fontWeight: 500,
                display: "block",
                marginBottom: 10,
              }}>
                Enter coupon code
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && !couponAttempted && handleApplyCoupon()}
                  disabled={couponAttempted}
                  style={{
                    flex: 1,
                    border: "1px solid #e0e0e0",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontWeight: 400,
                    fontSize: 11,
                    color: "#6B7280",
                    outline: "none",
                    background: couponAttempted ? "#f0f1f3" : "#fff",
                    fontFamily: "inter",
                    textTransform: "uppercase",
                  }}
                />
                {/* Show "Clear" after any apply attempt; "Apply" initially */}
                {couponAttempted ? (
                  <button
                    type="button"
                    onClick={handleClearCoupon}
                    style={{
                      background: "#fff",
                      color: "#dc2626",
                      border: "1.5px solid #dc2626",
                      borderRadius: 8,
                      padding: "10px 18px",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponChecking}
                    style={{
                      background: "#0d1b2a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 20px",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: couponChecking ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      transition: "background 0.15s",
                      opacity: couponChecking ? 0.7 : 1,
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      if (!couponChecking) e.currentTarget.style.background = "#1a2f45";
                    }}
                    onMouseLeave={(e) => {
                      if (!couponChecking) e.currentTarget.style.background = "#0d1b2a";
                    }}
                  >
                    {couponChecking ? "..." : "Apply"}
                  </button>
                )}
              </div>

              {/* Coupon messages — shown ONLY here in the coupon section */}
              {couponMsg.text && (
                <div style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inter",
                  background: couponMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
                  border: `1px solid ${couponMsg.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                  color: couponMsg.type === "success" ? "#065f46" : "#dc2626",
                }}>
                  {couponMsg.type === "success" ? "✅ " : "❌ "}{couponMsg.text}
                </div>
              )}
            </div>

            {/* Payment Summary */}
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontWeight: 600,
                fontSize: 16,
                color: "#131313",
                marginBottom: 14,
                fontFamily: "inter",
              }}>
                Payment Summary
              </div>

              {/* Plan fee — struck through when discount applied */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                color: "#555",
                marginBottom: 10,
                fontFamily: "inter",
              }}>
                <span>{planMeta?.name || "Plan Fee"}</span>
                <span style={{
                  fontWeight: 500,
                  color: discountAmt > 0 ? "#9ca3af" : "#4A4A4A",
                  textDecoration: discountAmt > 0 ? "line-through" : "none",
                  fontFamily: "inter",
                  fontSize: 13,
                }}>
                  ₹{baseFee}
                </span>
              </div>

              {/* Discount row — only when coupon applied */}
              {discountAmt > 0 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: "#059669",
                  marginBottom: 10,
                  fontFamily: "inter",
                }}>
                  <span>Discount{coupon ? ` (${coupon.trim().toUpperCase()})` : ""}</span>
                  <span style={{ fontWeight: 600, color: "#059669", fontFamily: "inter", fontSize: 13 }}>
                    − ₹{discountAmt}
                  </span>
                </div>
              )}

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                color: "#555",
                paddingBottom: 14,
                borderBottom: "1px solid #f0f0f0",
                marginBottom: 14,
              }}>
                <span>Processing Fee</span>
                <span style={{ fontWeight: 500, color: "#4A4A4A", fontFamily: "inter", fontSize: 13 }}>
                  ₹{PROCESSING_FEE}
                </span>
              </div>

              {/* Total — dynamic */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{ fontWeight: 600, fontSize: 15, color: "#131313", fontFamily: "inter" }}>
                  Total
                </span>
                <span style={{
                  fontWeight: 800,
                  fontSize: 24,
                  color: "#2ecc8e",
                  letterSpacing: "-0.5px",
                }}>
                  ₹{total}
                </span>
              </div>
            </div>

            {/* Divider */}
            <hr style={{ border: "none", borderTop: "1px solid #f0f0f0", margin: "0 0 20px" }} />

            {/* Select Payment Method */}
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontWeight: 600,
                fontSize: 16,
                color: "#131313",
                marginBottom: 14,
                fontFamily: "inter",
              }}>
                Select Payment Method
              </div>

              {/* UPI */}
              <div
                onClick={() => setSelectedMethod(selectedMethod === "upi" ? "" : "upi")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "13px 16px",
                  marginBottom: 10,
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 50,
                  background: "#EBEEF0",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1.2" stroke="#434652" strokeWidth="1.6" />
                    <rect x="5" y="5" width="3" height="3" rx="0.5" fill="#434652" />
                    <rect x="14" y="3" width="7" height="7" rx="1.2" stroke="#434652" strokeWidth="1.6" />
                    <rect x="16" y="5" width="3" height="3" rx="0.5" fill="#434652" />
                    <rect x="3" y="14" width="7" height="7" rx="1.2" stroke="#434652" strokeWidth="1.6" />
                    <rect x="5" y="16" width="3" height="3" rx="0.5" fill="#434652" />
                    <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3M21 16v2" stroke="#434652" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#4A4A4A", fontFamily: "inter" }}>
                    UPI
                  </div>
                  <div style={{ fontSize: 11, color: "#4A4A4A", marginTop: 2, fontFamily: "inter", fontWeight: 500 }}>
                    Google Pay • PhonePe • Paytm
                  </div>
                </div>
                {/* Radio */}
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: `2px solid ${selectedMethod === "upi" ? "#020202" : "#ccc"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "border-color 0.15s",
                }}>
                  {selectedMethod === "upi" && (
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#020202" }} />
                  )}
                </div>
              </div>

              {/* Credit / Debit Card */}
              <div
                onClick={() => setSelectedMethod(selectedMethod === "card" ? "" : "card")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderRadius: 12,
                  padding: "13px 16px",
                  cursor: "pointer",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 50,
                  background: "#EBEEF0",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="#434652" strokeWidth="1.7" />
                    <rect x="2" y="9" width="20" height="3" fill="#434652" />
                    <rect x="5" y="15" width="5" height="1.5" rx="0.7" fill="#434652" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#4A4A4A", fontFamily: "inter" }}>
                    Credit / Debit Card
                  </div>
                  <div style={{ fontSize: 11, color: "#4A4A4A", marginTop: 2, fontFamily: "inter", fontWeight: 500 }}>
                    Visa, Mastercard, RuPay
                  </div>
                </div>
                {/* Radio */}
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: `2px solid ${selectedMethod === "card" ? "#000000" : "#ccc"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  transition: "border-color 0.15s",
                }}>
                  {selectedMethod === "card" && (
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#000000" }} />
                  )}
                </div>
              </div>
            </div>

            {/* Payment error message — shown above Pay button only */}
            {payErrMsg && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                color: "#dc2626", borderRadius: 10, padding: "10px 14px",
                fontSize: 13, marginBottom: 12, fontWeight: 500, fontFamily: "inter",
              }}>
                {payErrMsg}
              </div>
            )}

            {/* Success banner */}
            {successMsg && (
              <div style={{
                background: "#ecfdf5", border: "1px solid #a7f3d0",
                color: "#065f46", borderRadius: 10, padding: "10px 14px",
                fontSize: 13, marginBottom: 12, fontWeight: 500, fontFamily: "inter",
              }}>
                {successMsg}
              </div>
            )}

            {/* Pay Button — ALWAYS yellow regardless of payment method selection */}
            <button
              type="button"
              onClick={handlePay}
              disabled={loading}
              style={{
                width: "100%",
                background: "#f5c518",
                color: "#111",
                border: "none",
                borderRadius: 12,
                padding: "16px",
                fontWeight: 700,
                fontSize: 16,
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: 14,
                letterSpacing: "0.1px",
                fontFamily: "inherit",
                transition: "background 0.15s",
                opacity: loading ? 0.8 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#e6b800";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "#f5c518";
              }}
            >
              {loading ? "Processing..." : `Pay ₹${total} & Unlock Contact`}
            </button>

            {/* Security badges */}
            <div style={{
              display: "flex", justifyContent: "center",
              alignItems: "center", gap: 20,
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#999" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z"
                    stroke="#aaa" strokeWidth="1.7" fill="none"
                  />
                  <path d="M9 12l2 2 4-4" stroke="#aaa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Secure Payment
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#999" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="#aaa" strokeWidth="1.7" />
                  <path d="M8 11V7a4 4 0 018 0v4" stroke="#aaa" strokeWidth="1.7" strokeLinecap="round" fill="none" />
                </svg>
                Encrypted
              </span>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
