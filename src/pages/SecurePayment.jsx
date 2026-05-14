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
  if (!raw) return "";
  let payload;
  try { payload = JSON.parse(raw); } catch { return ""; }
  if (!payload || !payload.from || !payload.to) return "";

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
    return newId;
  } catch (err) {
    console.error("Failed to publish ride:", err);
    return "";
  }
}

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

  // Coupon states — mirrors PostRidePayment exactly
  const [coupon,         setCoupon]         = useState("");
  const [couponChecking, setCouponChecking] = useState(false); // ← ADDED: loading state for Apply btn
  const [couponMsg,      setCouponMsg]      = useState({ text: "", type: "" }); // ← CHANGED: object {text,type}
  const [discountAmt,    setDiscountAmt]    = useState(0);     // ← ADDED: separate discount tracking
  const [discountedAmt,  setDiscountedAmt]  = useState(null);  // ← ADDED: plan price after discount

  // Payment
  const [selectedMethod, setSelectedMethod] = useState(""); // no default
  const [loading, setLoading]               = useState(false);
  const [errMsg, setErrMsg]                 = useState("");
  const [successMsg, setSuccessMsg]         = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await getPlans();
        const found = (r.plans || []).find((p) => p.key === planKey);
        if (found) {
          setPlanMeta(found);
          setDiscountedAmt(found.price); // init discountedAmt to full plan price
        }
      } catch {
        setErrMsg("Could not load plan details");
      }
    })();
  }, [planKey]);

  useEffect(() => { loadRazorpay().catch(() => {}); }, []);

  // Pricing — mirrors PostRidePayment: total = discountedAmt (PROCESSING_FEE = 0)
  const baseFee = planMeta?.price ?? 0;
  const total   = Math.max(0, (discountedAmt ?? baseFee));

  // ── Coupon apply — mirrors PostRidePayment.validateCoupon ──
  const handleApplyCoupon = async () => {
    const c = coupon.trim();
    if (!c) { setCouponMsg({ text: "Please enter a coupon code.", type: "error" }); return; }
    setCouponChecking(true);
    setCouponMsg({ text: "", type: "" });
    try {
      const r = await applyCoupon({ code: c.toUpperCase(), plan: planKey });
      if (r.isActive !== false) {
        // Coupon valid
        setDiscountAmt(r.discountAmount ?? r.cashback ?? 0);
        setDiscountedAmt(Math.max(0, baseFee - (r.discountAmount ?? r.cashback ?? 0)));
        setCouponMsg({
          text: `Coupon applied! You save ₹${r.discountAmount ?? r.cashback ?? 0}`,
          type: "success",
        });
      } else {
        setDiscountAmt(0);
        setDiscountedAmt(baseFee);
        setCouponMsg({ text: r.message || "Invalid coupon.", type: "error" });
      }
    } catch (err) {
      setDiscountAmt(0);
      setDiscountedAmt(baseFee);
      setCouponMsg({
        text: err?.response?.data?.message || err.message || "Could not validate. Try again.",
        type: "error",
      });
    } finally {
      setCouponChecking(false);
    }
  };

  const removeCoupon = () => {
    setCoupon("");
    setDiscountAmt(0);
    setDiscountedAmt(baseFee);
    setCouponMsg({ text: "", type: "" });
  };

  // ── Pay ──
  const handlePay = async () => {
    setErrMsg(""); setSuccessMsg("");
    if (!planKey || !planMeta) { setErrMsg("Plan not selected"); return; }
    if (!selectedMethod) { setErrMsg("Please select a payment method."); return; }
    setLoading(true);
    let orderId = null; // track for cancel-on-dismiss
    try {
      const order = await createPlanOrder({
        plan:       planKey,
        couponCode: discountAmt > 0 ? coupon.trim().toUpperCase() : "",
        method:     selectedMethod,
      });
      orderId = order.orderId;
      await loadRazorpay();
      const phone = localStorage.getItem("phone") || "";
      const email = localStorage.getItem("email") || "";

      const rzp = new window.Razorpay({
        key:      order.key,
        amount:   order.amount,
        currency: order.currency,
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
            setTimeout(() => {
              const pendingPostRide     = localStorage.getItem("pendingPostRide");
              const pendingUnlockRideId = localStorage.getItem("pendingUnlockRideId");
              const lastPostedRideId    = localStorage.getItem("lastPostedRideId");
              const rideId = publishedId || pendingUnlockRideId || lastPostedRideId || "";
              if (pendingUnlockRideId) localStorage.removeItem("pendingUnlockRideId");
              if (pendingPostRide)     localStorage.removeItem("pendingPostRide");
              // After posting a ride → always go to RideLive so user
              // can see their published ride details and use "View Ride"
              if (pendingPostRide) {
                if (rideId) navigate("/ride-live?rideId=" + rideId);
                else        navigate("/ride-live");
              } else if (rideId) {
                navigate("/ride-detail?rideId=" + rideId);
              } else {
                navigate("/ride-live");
              }
            }, 1500);
          } catch (e) {
            setErrMsg("Verification failed: " + (e?.response?.data?.message || e.message));
            setLoading(false);
          }
        },

        modal: {
          // ← ADDED: cancel order server-side when modal is dismissed (mirrors PostRidePayment)
          ondismiss: async () => {
            if (orderId) {
              await axios.post(`${API_BASE}/api/payment/cancel-order`, { orderId }).catch(() => {});
            }
            setErrMsg("Payment cancelled.");
            setLoading(false);
          },
        },
      });

      rzp.on("payment.failed", (resp) => {
        setErrMsg("Payment failed: " + (resp.error?.description || "Try again"));
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || err.message || "Could not start payment");
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
        padding: "36px 16px",
        
      }}>
        {/* Card — no shadow */}
        <div style={{
          width: "100%",
          maxWidth: 500,
          borderRadius: 16,
          overflow: "hidden",
          background: "#ffffff",
        }}>

          {/* Dark Header */}
          <div style={{
            background: "#080838",
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            height:115,
          }}>
            
            <h2 style={{
              color: "#ffffff", fontSize: 20, fontWeight: 500,
              margin: 0, letterSpacing: "0.1px",fontFamily:"inter",
            }}>
              Secure payment
            </h2>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Coupon — dashed border container matching Image 2 ── */}
            <div style={{
              border: "1.5px dashed #d0d7e2",
              borderRadius: 12,
              padding: "14px 16px",
              background: "#fafbfc",
            }}>
              {/* Label inside container */}
              <div style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "#131313",
                marginBottom: 10,
                fontFamily:"inter",
              }}>
                Enter coupon code
              </div>

              {/* Input + Button row */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Enter code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                  disabled={discountAmt > 0}
                  style={{
                    flex: 1,
                    border: "1.5px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 11,
                    fontWeight:400,
                    color: "#6B7280",
                    outline: "none",
                    fontFamily: "inter",
                    background: discountAmt > 0 ? "#f0f1f3" : "#ffffff",
                    textTransform: "uppercase",
                  }}
                />
                {discountAmt > 0 ? (
                  <button onClick={removeCoupon} style={{
                    background: "#fff", color: "#dc2626",
                    border: "1px solid #dc2626", borderRadius: 8,
                    padding: "10px 18px", fontWeight: 600, fontSize: 13,
                    cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
                  }}>Remove</button>
                ) : (
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponChecking}
                    style={{
                      background: "#0d1b2a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 22px",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: couponChecking ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      fontFamily: "inherit",
                      opacity: couponChecking ? 0.7 : 1,
                    }}
                  >
                    {couponChecking ? "..." : "Apply"}
                  </button>
                )}
              </div>

              {/* Coupon message */}
              {couponMsg.text && (
                <div style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderRadius: 6,
                  marginTop: 8,
                  wordBreak: "break-word",
                  background: couponMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
                  color:      couponMsg.type === "success" ? "#059669"  : "#dc2626",
                }}>
                  {couponMsg.text}
                </div>
              )}
            </div>

            {/* Thin divider */}
            <hr style={{ border: "none", borderTop: "1px solid #f0f2f5", margin: 0 }} />

            {/* ── Payment Summary ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#131313" , fontFamily:"inter",}}>
                Payment Summary
              </div>

              {/* Plan fee — strikethrough when discount applied ← ADDED */}
              <SummaryRow
                label={planMeta?.name || "Unlock Fee" }
                value={"₹" + baseFee}
                strikeValue={discountAmt > 0} // strike the original price
              />

              {/* Discount row — only when coupon applied ← ADDED */}
              {discountAmt > 0 && (
                <SummaryRow
                  label="Discount"
                  value={"− ₹" + discountAmt}
                  valueColor="#059669"
                />
              )}

              {/* Processing Fee — ₹0, shown for transparency */}
              <SummaryRow label="Processing Fee" value={"₹" + PROCESSING_FEE} />

              {/* Dashed line above Total */}
              <div style={{ borderTop: "1.5px dashed #d0d7e2", marginTop: 2 }} />

              {/* Total */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "4px 0",
              }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: "#16a34a" }}>
                  ₹{total}
                </span>
              </div>

              {/* Dashed line below Total */}
              <div style={{ borderTop: "1.5px dashed #d0d7e2" }} />
            </div>

            {/* ── Select Payment Method ── */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#131313", marginBottom: 12 }}>
                Select Payment Method
              </div>

              {/* UPI */}
              <PayMethod
                active={selectedMethod === "upi"}
                onClick={() => setSelectedMethod(selectedMethod === "upi" ? "" : "upi")}
                icon={
                  /* QR/UPI icon — grey circle bg, dark navy QR svg */
                  <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
                    <rect width="40" height="40" rx="20" fill="#f3f4f6"/>
                    {/* QR code simplified icon */}
                    <rect x="10" y="10" width="8" height="8" rx="1" stroke="#1e2d4a" strokeWidth="1.5" fill="none"/>
                    <rect x="12" y="12" width="4" height="4" rx="0.5" fill="#1e2d4a"/>
                    <rect x="22" y="10" width="8" height="8" rx="1" stroke="#1e2d4a" strokeWidth="1.5" fill="none"/>
                    <rect x="24" y="12" width="4" height="4" rx="0.5" fill="#1e2d4a"/>
                    <rect x="10" y="22" width="8" height="8" rx="1" stroke="#1e2d4a" strokeWidth="1.5" fill="none"/>
                    <rect x="12" y="24" width="4" height="4" rx="0.5" fill="#1e2d4a"/>
                    <rect x="22" y="22" width="2" height="2" fill="#1e2d4a"/>
                    <rect x="26" y="22" width="2" height="2" fill="#1e2d4a"/>
                    <rect x="22" y="26" width="2" height="2" fill="#1e2d4a"/>
                    <rect x="26" y="26" width="4" height="4" rx="0.5" fill="#1e2d4a"/>
                  </svg>
                }
                title="UPI"
                sub="Google Pay • PhonePe • Paytm"
              />

              {/* Credit / Debit Card */}
              <PayMethod
                active={selectedMethod === "card"}
                onClick={() => setSelectedMethod(selectedMethod === "card" ? "" : "card")}
                icon={
                  /* Card icon — grey circle bg, dark navy card svg */
                  <svg viewBox="0 0 40 40" width="40" height="40" fill="none">
                    <rect width="40" height="40" rx="20" fill="#f3f4f6"/>
                    <rect x="9" y="14" width="22" height="14" rx="2.5" stroke="#1e2d4a" strokeWidth="1.5" fill="none"/>
                    <rect x="9" y="18" width="22" height="3" fill="#1e2d4a"/>
                    <rect x="11" y="24" width="6" height="2" rx="0.8" fill="#1e2d4a"/>
                  </svg>
                }
                title="Credit / Debit Card"
                sub="Visa, Mastercard, RuPay"
              />
            </div>

            {/* Error banner */}
            {errMsg && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                color: "#b91c1c", padding: "8px 12px", borderRadius: 6,
                fontSize: 12, fontWeight: 500,
              }}>
                {errMsg}
              </div>
            )}

            {/* Success banner */}
            {successMsg && (
              <div style={{
                background: "#ecfdf5", border: "1px solid #a7f3d0",
                color: "#065f46", padding: "8px 12px", borderRadius: 6,
                fontSize: 12, fontWeight: 600,
              }}>
                {successMsg}
              </div>
            )}

            {/* CTA Button — disabled until method is selected */}
            {(() => {
              const isDisabled = loading || !planMeta || !selectedMethod;
              return (
                <button
                  onClick={handlePay}
                  disabled={isDisabled}
                  style={{
                    width: "100%",
                    background: "#E8CA2C",
                    color: "#1a1a1a",
                    border: "none",
                    borderRadius: 10,
                    padding: "15px 0",
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    letterSpacing: "0.2px",
                    fontFamily: "inherit",
                    transition: "background 0.2s, opacity 0.2s",
                    opacity: isDisabled ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) e.currentTarget.style.background = "#ca8a04";
                  }}
                  onMouseLeave={(e) => {
                    if (!isDisabled) e.currentTarget.style.background = "#eab308";
                  }}
                >
                  {loading
                    ? "Processing..."
                    : !selectedMethod
                      ? "Select a payment method"
                      : `Pay ₹${total} & Unlock Contact`}
                </button>
              );
            })()}

            {/* Trust badges */}
            <div style={{
              display: "flex", justifyContent: "center",
              gap: 20, fontSize: 11.5, color: "#9ca3af",
            }}>
              <span>🔒 Secure Payment</span>
              <span>🔑 Encrypted</span>
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ── Payment method row ──
function PayMethod({ active, onClick, icon, title, sub }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 4px",
        border: "none",          /* NO border — matches Image 1 exactly */
        borderRadius: 0,
        cursor: "pointer",
        marginBottom: 6,
        background: "transparent",
        transition: "opacity 0.15s",
      }}
    >
      {/* Icon — already has grey circle baked into SVG */}
      <div style={{
        width: 40, height: 40,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Labels */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>
      </div>

      {/* Radio — large dark navy ring, filled dot when active */}
      <div style={{
        width: 22,
        height: 22,
        borderRadius: "50%",
        flexShrink: 0,
        border: "2.5px solid " + (active ? "#0d1b2a" : "#0d1b2a"),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
      }}>
        {active && (
          <div style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: "#0d1b2a",
          }} />
        )}
</div>
    </div>
  );
}

// ── Summary row ──
function SummaryRow({ label, value, valueColor = "#6b7280", strikeValue = false }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      fontSize: 13, color: "#6b7280",
    }}>
      <span>{label}</span>
      <span style={{
        fontWeight: 500,
        color: strikeValue ? "#9ca3af" : valueColor,
        textDecoration: strikeValue ? "line-through" : "none", // ← ADDED: strikethrough support
      }}>
        {value}
      </span>
    </div>
  );
}
