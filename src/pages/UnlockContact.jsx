import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import {
  applyCoupon as applyCouponApi,
  createPlanOrder,
  verifyPlanPayment,
} from "../services/api";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || "";

// Razorpay checkout script loader (idempotent — safe to call many times)
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

// Publish whatever ride payload PostPage stashed in localStorage. Called
// the moment payment is verified so the ride appears in MongoDB only
// after the user actually pays.
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
    return newId;
  } catch (err) {
    console.error("Publish-after-payment failed:", err);
    return "";
  }
}

// Static pricing — the unlock product is a flat ₹49 + ₹1 processing fee.
const UNLOCK_FEE = 49;
const PROCESSING_FEE = 1;

export default function UnlockContact() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [coupon, setCoupon] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paying, setPaying] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  // discountAmount = how many rupees the coupon knocks off the Unlock Fee.
  // 0 means no coupon (or invalid). The render reads this and only shows
  // the "Discount" row + reduced total when > 0.
  const [discountAmount, setDiscountAmount] = useState(0);

  // Dynamic totals — recomputed on every render based on the applied coupon.
  const unlockAfterDiscount = Math.max(0, UNLOCK_FEE - discountAmount);
  const total = unlockAfterDiscount + PROCESSING_FEE;

  const planKey = (() => {
    try { return localStorage.getItem("chosenPlan") || "daily"; } catch { return "daily"; }
  })();

  // rideId from URL takes priority; fallback to localStorage breadcrumb
  // set during the login → otp → profile-setup chain.
  const urlRideId = searchParams.get("rideId") || "";
  // On mount, sync the URL rideId into localStorage so the post-payment
  // handler can always read it from one consistent place.
  useEffect(() => {
    if (urlRideId) {
      try { localStorage.setItem("pendingUnlockRideId", urlRideId); } catch (e) {}
    }
  }, [urlRideId]);

  // ── Pay Now → Razorpay → /ride-detail ──────────────────────────
  const handlePay = async () => {
    setErrMsg("");
    setSuccessMsg("");

    // Must have selected UPI or Card
    if (!selectedMethod) {
      setErrMsg("Please select a payment method.");
      return;
    }

    const phone = localStorage.getItem("phone") || "";
    if (!phone) {
      navigate("/login");
      return;
    }

    try {
      setPaying(true);
      await loadRazorpay();

      // Build the order on the backend (amount + Razorpay order id)
      const order = await createPlanOrder({
        plan: planKey,
        couponCode: appliedCoupon?.code || "",
        method: selectedMethod,
      });

      const rzp = new window.Razorpay({
        key: order.key || RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "TravelMate",
        description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan — Unlock Contact`,
        prefill: { contact: phone.replace(/^\+91/, "") },
        theme: { color: "#0d1b2a" },
        handler: async (response) => {
          try {
            await verifyPlanPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              plan: planKey,
              couponCode: appliedCoupon?.code || "",
              method: selectedMethod,
            });

            setSuccessMsg("✅ Payment verified — opening ride details…");

            // Navigate to the ride's detail page after short delay
            setTimeout(() => {
              const pendingUnlockRideId = localStorage.getItem("pendingUnlockRideId");
              const rideId = urlRideId || pendingUnlockRideId || "";
              if (pendingUnlockRideId) {
                try { localStorage.removeItem("pendingUnlockRideId"); } catch {}
              }
              try { localStorage.removeItem("chosenPlan"); } catch {}
              navigate(rideId ? `/ride-detail?rideId=${rideId}` : "/ride-detail");
            }, 1200);
          } catch (e) {
            setErrMsg(
              "Verification failed: " +
                (e?.response?.data?.message || e.message)
            );
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setErrMsg("Payment cancelled.");
            setPaying(false);
          },
        },
      });
      rzp.open();
    } catch (err) {
      console.error("Razorpay init failed:", err);
      setErrMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Could not start checkout. Try again."
      );
      setPaying(false);
    }
  };

  // ── Apply coupon → backend validates code + computes discount ─
  const handleApplyCoupon = async () => {
    setErrMsg("");
    setSuccessMsg("");
    if (!coupon.trim()) {
      setErrMsg("Please enter a coupon code.");
      return;
    }
    setCouponChecking(true);
    try {
      const code = coupon.trim().toUpperCase();
      const res = await applyCouponApi({ code, plan: planKey });
      // Backend response shape varies — accept either discountAmount,
      // cashback, or amount as the rupee value.
      const amt = Number(
        res?.discountAmount ?? res?.cashback ?? res?.amount ?? 0
      );
      if (!amt || amt <= 0) {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setErrMsg(res?.message || "Coupon has no value for this plan.");
        return;
      }
      // Cap discount at the unlock fee — you can't discount more than the
      // base amount (we don't allow a negative price).
      const safeAmt = Math.min(amt, UNLOCK_FEE);
      setAppliedCoupon({ code, ...res, discountAmount: safeAmt });
      setDiscountAmount(safeAmt);
      setSuccessMsg(`Coupon applied — you save ₹${safeAmt}.`);
    } catch (e) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setErrMsg(e?.response?.data?.message || "Invalid coupon code.");
    } finally {
      setCouponChecking(false);
    }
  };

  const removeCoupon = () => {
    setCoupon("");
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setSuccessMsg("");
    setErrMsg("");
  };

  return (
    <div
      className="unlock-contact-page"
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
        className="unlock-contact-card"
        style={{
          width: "100%",
          maxWidth: 500,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          background: "#fff",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            background: "linear-gradient(135deg, #0d1b2a 0%, #161f35 100%)",
            padding: "30px 28px 26px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            {/* Lock icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect
                x="4"
                y="10"
                width="16"
                height="12"
                rx="2.5"
                stroke="#fff"
                strokeWidth="1.8"
              />
              <path
                d="M8 10V7a4 4 0 018 0v3"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16" r="1.5" fill="#fff" />
            </svg>
            <h2
              style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 600,
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              Unlock Contact
            </h2>
          </div>
          <p style={{ color: "#FFFFFF", fontSize: 13, margin: 0 , fontWeight:400, fontFamily:"inter" }}>
            Secure payment to access driver contact details
          </p>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "24px 24px 28px" }}>

          {/* Coupon Code */}
          <div
            style={{
              background: "#f9fafc",
              border: "1px solid #e8eaf0",
              borderRadius: 12,
              padding: "16px 16px 14px",
              marginBottom: 22,
            }}
          >
            <label
              style={{
                fontSize: 11,
                color: "#131313",
                fontWeight: 500,
                display: "block",
                marginBottom: 10,
              }}
            >
              Enter coupon code
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Enter code"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && !appliedCoupon && handleApplyCoupon()}
                disabled={!!appliedCoupon}
                style={{
                  flex: 1,
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontWeight: 400,
                  fontSize: 11,
                  color: "#6B7280",
                  outline: "none",
                  background: appliedCoupon ? "#f0f1f3" : "#fff",
                  fontFamily: "inter",
                  textTransform: "uppercase",
                }}
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={removeCoupon}
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
                  }}
                >
                  Remove
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
          </div>

          {/* Payment Summary */}
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                color: "#131313",
                marginBottom: 14,
                fontFamily:"inter",
              }}
            >
              Payment Summary
            </div>

            {/* Unlock Fee — struck through when a coupon is applied */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                color: "#555",
                marginBottom: 10,
                fontFamily: "inter",
              }}
            >
              <span>Unlock Fee</span>
              <span
                style={{
                  fontWeight: 500,
                  color: discountAmount > 0 ? "#9ca3af" : "#4A4A4A",
                  textDecoration: discountAmount > 0 ? "line-through" : "none",
                  fontFamily: "inter",
                  fontSize: 13,
                }}
              >
                ₹{UNLOCK_FEE}
              </span>
            </div>

            {/* Discount — only shown when a coupon is applied */}
            {discountAmount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: "#059669",
                  marginBottom: 10,
                  fontFamily: "inter",
                }}
              >
                <span>Discount{appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}</span>
                <span style={{ fontWeight: 600, color: "#059669", fontFamily: "inter", fontSize: 13 }}>
                  − ₹{discountAmount}
                </span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                color: "#555",
                paddingBottom: 14,
                borderBottom: "1px solid #f0f0f0",
                marginBottom: 14,
              }}
            >
              <span>Processing Fee</span>
              <span style={{ fontWeight: 500, color: "#4A4A4A", fontFamily: "inter", fontSize: 13 }}>
                ₹{PROCESSING_FEE}
              </span>
            </div>

            {/* Total — dynamic */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 15, color: "#131313", fontFamily: "inter" }}>
                Total
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 24,
                  color: "#2ecc8e",
                  letterSpacing: "-0.5px",
                }}
              >
                ₹{total}
              </span>
            </div>
          </div>

          {/* Divider */}
          <hr
            style={{
              border: "none",
              borderTop: "1px solid #f0f0f0",
              margin: "0 0 20px",
            }}
          />

          {/* Select Payment Method */}
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 16,
                color: "#131313",
                marginBottom: 14,
                fontFamily:"inter",
              }}
            >
              Select Payment Method
            </div>

            {/* UPI */}
            <div
              onClick={() => setSelectedMethod("upi")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: `1.5px solid ${
                  selectedMethod === "upi" ? "#2ecc8e" : "#eee"
                }`,
                borderRadius: 12,
                padding: "13px 16px",
                marginBottom: 10,
                cursor: "pointer",
                background: selectedMethod === "upi" ? "#f4fdf9" : "#fff",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "#f0f3ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {/* QR / UPI icon */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.2" stroke="#5b6ef5" strokeWidth="1.6" />
                  <rect x="5" y="5" width="3" height="3" rx="0.5" fill="#5b6ef5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.2" stroke="#5b6ef5" strokeWidth="1.6" />
                  <rect x="16" y="5" width="3" height="3" rx="0.5" fill="#5b6ef5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.2" stroke="#5b6ef5" strokeWidth="1.6" />
                  <rect x="5" y="16" width="3" height="3" rx="0.5" fill="#5b6ef5" />
                  <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3M21 16v2" stroke="#5b6ef5" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>
                  UPI
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                  Google Pay • PhonePe • Paytm
                </div>
              </div>

              {/* Radio */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: `2px solid ${
                    selectedMethod === "upi" ? "#2ecc8e" : "#ccc"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "border-color 0.15s",
                }}
              >
                {selectedMethod === "upi" && (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#2ecc8e",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Credit / Debit Card */}
            <div
              onClick={() => setSelectedMethod("card")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: `1.5px solid ${
                  selectedMethod === "card" ? "#2ecc8e" : "#eee"
                }`,
                borderRadius: 12,
                padding: "13px 16px",
                cursor: "pointer",
                background: selectedMethod === "card" ? "#f4fdf9" : "#fff",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "#f0f3ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="2"
                    y="5"
                    width="20"
                    height="14"
                    rx="2.5"
                    stroke="#5b6ef5"
                    strokeWidth="1.7"
                  />
                  <rect x="2" y="9" width="20" height="3" fill="#5b6ef5" />
                  <rect x="5" y="15" width="5" height="1.5" rx="0.7" fill="#5b6ef5" />
                </svg>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>
                  Credit / Debit Card
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                  Visa, Mastercard, RuPay
                </div>
              </div>

              {/* Radio */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: `2px solid ${
                    selectedMethod === "card" ? "#2ecc8e" : "#ccc"
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "border-color 0.15s",
                }}
              >
                {selectedMethod === "card" && (
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#2ecc8e",
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Inline status messages above Pay so the user can see why the
              Razorpay popup was blocked or why verification failed. */}
          {errMsg && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              color: "#dc2626", borderRadius: 10, padding: "10px 14px",
              fontSize: 13, marginBottom: 12, fontWeight: 500,
            }}>
              {errMsg}
            </div>
          )}
          {successMsg && (
            <div style={{
              background: "#ecfdf5", border: "1px solid #a7f3d0",
              color: "#065f46", borderRadius: 10, padding: "10px 14px",
              fontSize: 13, marginBottom: 12, fontWeight: 500,
            }}>
              {successMsg}
            </div>
          )}

          {/* Pay Button — wired to Razorpay → /ride-detail */}
          {(() => {
            const isDisabled = paying || !selectedMethod;
            return (
              <button
                type="button"
                onClick={handlePay}
                disabled={isDisabled}
                style={{
                  width: "100%",
                  background: isDisabled ? "#e6c958" : "#f5c518",
                  color: "#111",
                  border: "none",
                  borderRadius: 12,
                  padding: "16px",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  marginBottom: 14,
                  letterSpacing: "0.1px",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                  opacity: isDisabled ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) e.currentTarget.style.background = "#e6b800";
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled) e.currentTarget.style.background = "#f5c518";
                }}
              >
                {paying
                  ? "Processing..."
                  : !selectedMethod
                    ? "Select a payment method"
                    : `Pay ₹${total} & Unlock Contact`}
              </button>
            );
          })()}

          {/* Security badges */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 20,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "#999",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z"
                  stroke="#aaa"
                  strokeWidth="1.7"
                  fill="none"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#aaa"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Secure Payment
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "#999",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="#aaa"
                  strokeWidth="1.7"
                />
                <path
                  d="M8 11V7a4 4 0 018 0v4"
                  stroke="#aaa"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  fill="none"
                />
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
