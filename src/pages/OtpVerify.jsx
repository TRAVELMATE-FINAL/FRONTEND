import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyOtp, sendOtp } from "../services/api";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const mobileNumber = location.state?.mobileNumber || "";

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef([]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Redirect if no phone number in state
  useEffect(() => {
    if (!mobileNumber) navigate("/");
  }, [mobileNumber, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    setError("");

    // Move to next box
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") handleVerify();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const updated = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) updated[i] = pasted[i];
    setDigits(updated);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const otp = digits.join("");
  const isComplete = otp.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isComplete) return;
    setError("");
    setLoading(true);
    try {
      await verifyOtp(mobileNumber, otp);
      setSuccess("✅ Verified successfully! Redirecting...");
      setTimeout(() => navigate("/profile-setup"), 1500);
    } catch (err) {
      setError(err.message);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await sendOtp(mobileNumber);
      setDigits(Array(OTP_LENGTH).fill(""));
      setResendTimer(RESEND_SECONDS);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const maskedNumber = mobileNumber
    ? mobileNumber.slice(0, 3) + "XXXXXXX" + mobileNumber.slice(-2)
    : "";

  return (
    <div style={styles.root}>
      {/* Background watermark */}
      <div style={styles.bgText} aria-hidden="true">TravelMate</div>

      {/* Back button */}
      <button onClick={() => navigate(-1)} style={styles.back}>
  ← Back
</button>

      {/* OTP Card */}
      <div style={styles.card}>
        {/* Phone icon */}
        <div style={styles.iconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
        </div>

        <h2 style={styles.title}>Verify your number</h2>
        <p style={styles.subtitle}>
          Enter the code sent to <strong>{maskedNumber}</strong>
        </p>

        {/* OTP Inputs */}
        <div style={styles.otpRow}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              style={{
                ...styles.otpInput,
                borderColor: d ? "#2563eb" : "#d1d5db",
                background: d ? "#eff6ff" : "#fff",
                boxShadow: d ? "0 0 0 3px rgba(37,99,235,0.15)" : "none",
              }}
            />
          ))}
        </div>

        {/* Error / Success */}
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.successMsg}>{success}</div>}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={!isComplete || loading}
          style={{
            ...styles.btn,
            opacity: !isComplete || loading ? 0.5 : 1,
            cursor: !isComplete || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        {/* Resend */}
        <p style={styles.resendRow}>
          {resendTimer > 0 ? (
            <>
              Resend OTP in{" "}
              <span style={styles.timerBlue}>{resendTimer}s</span>
            </>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              style={styles.resendBtn}
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </p>

        <p style={styles.hint}>
          Didn't receive the code? Check your messages or try resending
        </p>

        <div style={styles.secure}>
          🔒 Secure verification • Your data is encrypted
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#e8eaf6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Segoe UI', sans-serif",
  },
  bgText: {
    position: "absolute",
    fontSize: "clamp(80px, 18vw, 220px)",
    fontWeight: 900,
    color: "rgba(155,133,210,0.25)",
    letterSpacing: "-4px",
    userSelect: "none",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 0,
  },
  back: {
    position: "fixed",
    top: 20,
    left: 20,
    background: "none",
    border: "none",
    fontSize: 15,
    color: "#374151",
    cursor: "pointer",
    fontWeight: 500,
    zIndex: 10,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "44px 40px",
    maxWidth: 400,
    width: "90%",
    textAlign: "center",
    boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
    position: "relative",
    zIndex: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#0e2454",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 8px",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
    margin: "0 0 28px",
    lineHeight: 1.5,
  },
  otpRow: {
    display: "flex",
    gap: 10,
    justifyContent: "center",
    marginBottom: 20,
  },
  otpInput: {
    width: 46,
    height: 54,
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    color: "#1f2937",
    border: "2px solid #d1d5db",
    borderRadius: 10,
    outline: "none",
    transition: "all 0.15s",
    caretColor: "#2563eb",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 16,
  },
  successMsg: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#16a34a",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 16,
  },
  btn: {
    width: "100%",
    padding: "15px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 600,
    transition: "opacity 0.2s",
    marginBottom: 16,
  },
  resendRow: {
    fontSize: 14,
    color: "#6b7280",
    margin: "0 0 8px",
  },
  timerBlue: { color: "#2563eb", fontWeight: 600 },
  resendBtn: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    textDecoration: "underline",
  },
  hint: {
    color: "#9ca3af",
    fontSize: 12,
    margin: "0 0 20px",
    lineHeight: 1.5,
  },
  secure: {
    fontSize: 12,
    color: "#9ca3af",
    borderTop: "1px solid #f3f4f6",
    paddingTop: 16,
  },
};
