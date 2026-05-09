import { useState } from "react";

export default function UnlockContact() {
  const [coupon, setCoupon] = useState("");
  const [selectedMethod, setSelectedMethod] = useState(null);

  return (
    <div
      className="unlock-contact-page"
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
        className="unlock-contact-card"
        style={{
          width: "100%",
          maxWidth: 420,
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
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              Unlock Contact
            </h2>
          </div>
          <p style={{ color: "#8fa8c0", fontSize: 13, margin: 0 }}>
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
                fontSize: 12,
                color: "#555",
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
                onChange={(e) => setCoupon(e.target.value)}
                style={{
                  flex: 1,
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: "#333",
                  outline: "none",
                  background: "#fff",
                  fontFamily: "inherit",
                }}
              />
              <button
                style={{
                  background: "#0d1b2a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#1a2f45")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#0d1b2a")
                }
              >
                Apply
              </button>
            </div>
          </div>

          {/* Payment Summary */}
          <div style={{ marginBottom: 22 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "#111",
                marginBottom: 14,
              }}
            >
              Payment Summary
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                color: "#555",
                marginBottom: 10,
              }}
            >
              <span>Unlock Fee</span>
              <span style={{ fontWeight: 500, color: "#222" }}>₹49</span>
            </div>

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
              <span style={{ fontWeight: 500, color: "#222" }}>₹1</span>
            </div>

            {/* Total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>
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
                ₹50
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
                fontWeight: 700,
                fontSize: 15,
                color: "#111",
                marginBottom: 14,
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

          {/* Pay Button */}
          <button
            style={{
              width: "100%",
              background: "#f5c518",
              color: "#111",
              border: "none",
              borderRadius: 12,
              padding: "16px",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              marginBottom: 14,
              letterSpacing: "0.1px",
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#e6b800")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#f5c518")
            }
          >
            Pay ₹50 &amp; Unlock Contact
          </button>

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
                />
              </svg>
              Encrypted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
