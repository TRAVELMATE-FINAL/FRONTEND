import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOtp } from "../services/api";

const COUNTRY_CODES = [
  { code: "IN", dial: "+91", flag: "🇮🇳" },
  { code: "US", dial: "+1", flag: "🇺🇸" },
  { code: "GB", dial: "+44", flag: "🇬🇧" },
  { code: "AE", dial: "+971", flag: "🇦🇪" },
  { code: "SG", dial: "+65", flag: "🇸🇬" },
];

export default function Signin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(COUNTRY_CODES[0]);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 
  const isValid = /^\d{10}$/.test(phone) && agreed;
  const handleSubmit = async () => {
  if (loading) return; // prevent spam clicks

  setError("");

  // 🔴 STRICT VALIDATION (exactly 10 digits)
  if (!/^\d{10}$/.test(phone)) {
    setError("Phone number must be exactly 10 digits");
    return;
  }

  if (!agreed) {
    setError("Please agree to the Terms of Service and Privacy Policy.");
    return;
  }

  const fullNumber = `${country.dial}${phone}`;

  try {
    setLoading(true);

    await sendOtp(fullNumber);

    navigate("/otp", { state: { mobileNumber: fullNumber } });

  } catch (err) {
    // ✅ Proper API error handling
    setError(err.response?.data?.message || "Failed to send OTP");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="signin-page" style={styles.root}>
      {/* Left Panel */}
      <div className="signin-left" style={styles.left}>
        <div style={styles.leftContent}>
          <h1 style={styles.heroTitle}>
            Join the community <span style={styles.emoji}>🤝</span>
          </h1>
          <p style={styles.heroSub}>Share your plans and meet people like you</p>

          <div style={styles.featureList}>
            {[
              {
                icon: "⭐",
                title: "Share What You're Doing",
                desc: "Let others know where you're heading",
                bg: "#1e3a6e",
              },
              {
                icon: "👥",
                title: "Meet Like-Minded People",
                desc: "Connect with others going your way",
                bg: "#1e3a6e",
              },
              {
                icon: "🎉",
                title: "Build Your Network",
                desc: "Join a community of friendly travelers",
                bg: "#1e3a6e",
              },
            ].map((f) => (
              <div key={f.title} style={{ ...styles.featureCard, background: f.bg }}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <div>
                  <div style={styles.featureTitle}>{f.title}</div>
                  <div style={styles.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.stats}>
            {[
              { val: "50K+", label: "Active Users" },
              { val: "100%", label: "Verified" },
              { val: "4.8★", label: "Rating" },
            ].map((s) => (
              <div key={s.label} style={styles.stat}>
                <div style={styles.statVal}>{s.val}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="signin-right" style={styles.right}>
        <div className="signin-form" style={styles.form}>
          <h2 style={styles.formTitle}>Create your account</h2>
          <p style={styles.formSub}>Join 50,000+ verified travelers</p>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Mobile Number</label>
            <div style={styles.phoneRow}>
              <select
                value={country.code}
                onChange={(e) =>
                  setCountry(COUNTRY_CODES.find((c) => c.code === e.target.value))
                }
                style={styles.countrySelect}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.dial}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={styles.phoneInput}
                maxLength={10}
              />
            </div>
            <p style={styles.hint}>ⓘ We'll send an OTP to verify your number</p>
          </div>

          <label style={styles.checkRow}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkText}>
              I agree to Travel Mate's{" "}
              <a href="#" style={styles.link}>Terms of Service</a> and{" "}
              <a href="#" style={styles.link}>Privacy Policy</a>
            </span>
          </label>

          {error && <div style={styles.error}>{error}</div>}

         <button
  onClick={handleSubmit}
  disabled={!isValid || loading}
  style={{
    ...styles.btn,
    background: isValid ? "#2563eb" : "#9ca3af",
    opacity: loading ? 0.7 : 1,
    cursor: !isValid || loading ? "not-allowed" : "pointer",
  }}
>
  {loading ? "Sending OTP..." : "Continue with OTP"}
</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    height: "100vh",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },

  // 🔵 LEFT PANEL
  left: {
    flex: 1,
    background: "#0b1f5b", // deeper blue (closer to figma)
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "64px",
  },

  leftContent: {
    maxWidth: 460,
    width: "100%",
  },

  heroTitle: {
  color: "#fff",
  fontSize: 42,          // 🔥 increase (was ~36–40)
  fontWeight: 700,
  lineHeight: 1.1,       // 🔥 tighter
  letterSpacing: "-0.5px",
  marginBottom: 12,
},

  emoji: { fontSize: 34 },

  heroSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginBottom: 40,
  },

  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    marginBottom: 48,
  },

  featureCard: {
  display: "flex",
  alignItems: "center",
  gap: 18,

  padding: "22px 24px",   // 🔥 more vertical + horizontal space
  minHeight: 70,          // 🔥 force taller card

  borderRadius: 16,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",

  width: "100%",          // 🔥 full width like figma
},
  featureIcon: {
    fontSize: 26,
    width: 52,
    height: 46,
    background: "rgba(255,255,255,0.15)", 
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  featureTitle: {
    color: "#fff",
    fontWeight: 600,
    fontSize: 18,
    marginBottom: 2,
    lineHeight: 1.3, 
  },

  featureDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    lineHeight: 1.6,
  },

  

  stats: {
  display: "flex",
  justifyContent: "space-between", // or "space-around"
  alignItems: "center",
  gap: 50,
  marginTop: 20,
},
  stat: {
  flex: 1,                 // 🔥 equal spacing
  textAlign: "center",     // 🔥 center each block
},
 

  statVal: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 28,
  },

  statLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 1.4,
  },

  // ⚪ RIGHT PANEL
  right: {
  flex: 1,
  background: "#f9fafb",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",   // 🔥 FIX
  paddingLeft: "80px",           // 🔥 PUSH CONTENT LEFT LIKE FIGMA
},

  form: {
    maxWidth: 420,
    width: "100%",
    textAlign: "left",
  },

  formTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
    lineHeight: 1.25,
  },

  formSub: {
    color: "#6b7280",
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 1.5,
  },

  fieldGroup: {
    marginBottom: 20,
  },

  label: {
    display: "block",
    fontWeight: 600,
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },

  phoneRow: {
    display: "flex",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
    background: "#fff",
    height: 54,
  },

  countrySelect: {
    padding: "0 12px",
    border: "none",
    borderRight: "1px solid #e5e7eb",
    background: "transparent",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    outline: "none",
    cursor: "pointer",
  },

  phoneInput: {
    flex: 1,
    padding: "0 16px",
    border: "none",
    outline: "none",
    fontSize: 15,
    color: "#111827",
  },

  hint: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 6,
    textAlign: "left",
  },

  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },

  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#2563eb",
    cursor: "pointer",
  },

  checkText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.6, 
  },

  link: {
    color: "#2563eb",
    fontWeight: 500,
    textDecoration: "none",
  },

  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 14,
  },

  btn: {
  width: "100%",
  height: 56,   // 🔥 fixed height (better than padding)
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "#fff",
  border: "none",
  borderRadius: 12,    // 🔥 slightly more rounded
  fontSize: 17,        // 🔥 bigger text
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 12,
  
},

  btnActive: {
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    color: "#fff",
    boxShadow: "0 8px 24px rgba(37,99,235,0.25)",
    cursor: "pointer",
  },

  btn: {
    width: "100%",
    height: 56,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 12,
  },

  btnDisabled: {
    background: "#9ca3af",
    color: "#fff",
    cursor: "not-allowed",
  },
};
