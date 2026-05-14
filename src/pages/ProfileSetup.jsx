import { useNavigate } from "react-router-dom";
import { saveProfile } from "../services/api";
import { useState, useRef, useEffect } from "react";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [photo, setPhoto]       = useState(null);
  const [gender, setGender]     = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [dob, setDob]           = useState("");
  const [city, setCity]         = useState("");
  const [about, setAbout]       = useState("");
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  // ✅ ADD HERE
useEffect(() => {
  return () => {
    if (photo) URL.revokeObjectURL(photo);
  };
}, [photo]);

  const handlePhoto = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setErrors((prev) => ({ ...prev, photo: "Please upload an image file." }));
    return;
  }

  setErrors((prev) => ({ ...prev, photo: "" }));
  setPhoto(file); // ✅ correct
};
  const validate = () => {
    const errs = {};
    if (!fullName.trim())
      errs.fullName = "Full name is required.";
    else if (fullName.trim().length < 2)
      errs.fullName = "Name must be at least 2 characters.";

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Enter a valid email address.";

    if (dob) {
      const dobDate = new Date(dob);
      const today   = new Date();
      const age     = today.getFullYear() - dobDate.getFullYear();
      if (age < 13) errs.dob = "You must be at least 13 years old.";
      if (dobDate > today) errs.dob = "Date of birth cannot be in the future.";
    }

    if (!city.trim())
  errs.city = "City is required.";

    if (about && about.length > 300)
      errs.about = "Bio must be under 300 characters.";

    return errs;
  };

const uploadToCloudinary = async () => {
  if (!photo) return "";

  const formData = new FormData();
  formData.append("file", photo);
  formData.append("upload_preset", "TRAVELMATE");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dm2kibnbx/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  if (!data.secure_url) {
    console.log("Upload error:", data);
    throw new Error("Image upload failed");
  }

  return data.secure_url;
};

const handleSubmit = async () => {
  if (loading) return;

  const errs = validate();
  if (Object.keys(errs).length > 0) {
    setErrors(errs);
    return;
  }

  const phone = localStorage.getItem("phone");

  if (!phone) {
    setErrors({ api: "Session expired. Please login again." });
    navigate("/", { replace: true });
    return;
  }

  setLoading(true);

  try {
    const photoUrl = photo ? await uploadToCloudinary() : "";

    console.log("FINAL PAYLOAD:", {
  phone,
  fullName,
  email,
  dob,
  city,
  about,
  gender,
  photo: photoUrl,
});

await saveProfile({
  phone,
  fullName: fullName.trim(),
  email,
  dob,
  city: city.trim(),
  about: about.trim(),
  gender,
  photo: photoUrl, // ✅ URL, not file
});

    // ── Branch on the saved "what brought you here" breadcrumb ──
    //   • pendingPostRide      → user is mid-Publish Ride flow → /plan
    //   • pendingUnlockRideId  → user is mid-Unlock Contact   → /findrideplan
    //   • normal sign-up       → /find-ride dashboard
    const pendingPostRide     = localStorage.getItem("pendingPostRide");
    const pendingUnlockRideId = localStorage.getItem("pendingUnlockRideId");
    if (pendingPostRide) {
      navigate("/plan", { replace: true });
    } else if (pendingUnlockRideId) {
      navigate(`/findrideplan?rideId=${pendingUnlockRideId}`, { replace: true });
    } else {
      navigate("/find-ride", { replace: true });
    }

  } catch (err) {
    setErrors({
      api: err.response?.data?.message || "Failed to save profile",
    });
  } finally {
    setLoading(false);
  }
};
  return (
    <>
      <style>{`
        html, body, #root { margin: 0; padding: 0; height: 100%; }
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        ::placeholder { color: #b0b8c9; }
        textarea { resize: none; }
      `}</style>

      {/* full-page background */}
      <div className="profile-page" style={s.page}>
        <div style={s.bgText} aria-hidden="true">TravelMate</div>

        {/* card */}
        <div className="profile-card" style={s.card}>

          {/* ── header icon ── */}
          <div style={s.headerIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          <h2 style={s.title}>Complete your profile</h2>
          <p style={s.subtitle}>You're verified! Now let's personalize your account</p>

          {/* ── progress bar ── */}
          <div style={s.progressRow}>
            <span style={s.progressLabel}>Final Step</span>
            <span style={s.progressPct}>90% complete</span>
          </div>
          <div style={s.progressTrack}>
            <div style={s.progressFill} />
          </div>

          {/* ── avatar upload ── */}
          <div style={s.avatarSection}>
            <div style={s.avatarWrap} onClick={() => fileRef.current.click()}>
              {photo ? (
               <img
  src={URL.createObjectURL(photo)}
  alt="profile"
  style={s.avatarImg}
/>
              ) : (
                <div style={s.avatarPlaceholder}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none"
                    stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
              )}
              {/* camera badge */}
              <div style={s.cameraBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*"
              onChange={handlePhoto} style={{ display: "none" }} />
            <p style={s.avatarHint}>Add a friendly photo (optional)</p>
            {errors.photo && <p style={s.fieldError}>{errors.photo}</p>}
          </div>

          {/* ── gender toggle ── */}
          <div style={s.genderRow}>
            {["Male", "Female"].map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                style={{
                  ...s.genderBtn,
                  ...(gender === g ? s.genderBtnActive : {}),
                }}
              >
                <span style={s.genderIcon}>{g === "Male" ? "👤" : "👤"}</span>
                {g}
              </button>
            ))}
          </div>

          {/* ── Full Name ── */}
          <div style={s.fieldGroup}>
            <label style={s.label}>
              Full Name <span style={s.required}>*</span>
            </label>
            <div style={{ ...s.inputWrap, ...(errors.fullName ? s.inputError : {}) }}>
              <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="#b0b8c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: "" })); }}
                style={s.input}
              />
            </div>
            {errors.fullName && <p style={s.fieldError}>{errors.fullName}</p>}
          </div>

          {/* ── Email ── */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Email (Optional)</label>
            <div style={{ ...s.inputWrap, ...(errors.email ? s.inputError : {}) }}>
              <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="#b0b8c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                style={s.input}
              />
            </div>
            {errors.email && <p style={s.fieldError}>{errors.email}</p>}
          </div>

          {/* ── DOB + City ── */}
          <div style={s.twoCol}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Date of Birth</label>
              <div style={{ ...s.inputWrap, ...(errors.dob ? s.inputError : {}) }}>
                <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="#b0b8c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input
                  type="date"
                  value={dob}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => { setDob(e.target.value); setErrors((p) => ({ ...p, dob: "" })); }}
                  style={{ ...s.input, colorScheme: "light" }}
                />
              </div>
              {errors.dob && <p style={s.fieldError}>{errors.dob}</p>}
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>City <span style={s.required}>*</span></label>
              <div style={{ ...s.inputWrap, ...(errors.city ? s.inputError : {}) }}>
                <svg style={s.inputIcon} width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="#b0b8c9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <input
                  type="text"
                  placeholder="Chennai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={s.input}
                />
              </div>
              {errors.city && <p style={s.fieldError}>{errors.city}</p>}
            </div>
          </div>

          {/* ── About ── */}
          <div style={s.fieldGroup}>
            <label style={s.label}>About You (Optional)</label>
            <div style={{ ...s.inputWrap, ...(errors.about ? s.inputError : {}), alignItems: "flex-start" }}>
              <textarea
                rows={4}
                placeholder="Tell others a bit about yourself..."
                value={about}
                onChange={(e) => { setAbout(e.target.value); setErrors((p) => ({ ...p, about: "" })); }}
                style={{ ...s.input, paddingTop: 12, paddingBottom: 12, lineHeight: 1.55 }}
              />
            </div>
            <div style={s.aboutFooter}>
              <p style={s.aboutHint}>Help others get to know you better</p>
              <p style={{ ...s.aboutHint, color: about.length > 280 ? "#dc2626" : "#b0b8c9" }}>
                {about.length}/300
              </p>
            </div>
            {errors.about && <p style={s.fieldError}>{errors.about}</p>}
          </div>

          {/* ── privacy notice ── */}
          <div style={s.privacyRow}>
            🔒 Your information is private and secure
          </div>

          {/* ── API error banner ── */}
          {errors.api && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              color: "#dc2626", borderRadius: 10,
              padding: "10px 14px", fontSize: 13, marginBottom: 12,
              textAlign: "center"
            }}>
              ⚠️ {errors.api}
            </div>
          )}

          {/* ── submit ── */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Setting up…" : "Complete Setup"}
          </button>
        </div>

        {/* bottom hint */}
        <p style={s.bottomHint}>🎉 Almost done! One more step to join the community</p>
      </div>
    </>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#e8eaf6",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },
  bgText: {
    position: "absolute",
    fontSize: "clamp(80px, 18vw, 200px)",
    fontWeight: 900,
    color: "rgba(155,133,210,0.2)",
    letterSpacing: "-4px",
    userSelect: "none",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 0,
  },

  // card
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "36px 40px",
    width: "100%",
    maxWidth: 520,
    position: "relative",
    zIndex: 1,
    boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
  },

  // header
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: "50%",
    background: "#0e2454",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: 700,
    color: "#0b1d3a",
    margin: "0 0 6px",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 13,
    color: "#6b7280",
    margin: "0 0 18px",
  },

  // progress
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontSize: 12, color: "#6b7280" },
  progressPct:   { fontSize: 12, color: "#6b7280" },
  progressTrack: {
    width: "100%",
    height: 5,
    background: "#e5e7eb",
    borderRadius: 99,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressFill: {
    width: "90%",
    height: "100%",
    background: "linear-gradient(90deg, #7c3aed, #ec4899)",
    borderRadius: 99,
  },

  // avatar
  avatarSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrap: {
    position: "relative",
    width: 80,
    height: 80,
    cursor: "pointer",
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #e5e7eb",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "#0e2454",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #fff",
  },
  avatarHint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 8,
    marginBottom: 0,
  },

  // gender
  genderRow: {
    display: "flex",
    gap: 12,
    marginBottom: 20,
    justifyContent: "center",
  },
  genderBtn: {
    flex: 1,
    maxWidth: 130,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 16px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    background: "#fff",
    fontSize: 14,
    fontWeight: 500,
    color: "#6b7280",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  genderBtnActive: {
    border: "1.5px solid #2563eb",
    background: "#eff6ff",
    color: "#2563eb",
  },
  genderIcon: { fontSize: 16 },

  // fields
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  fieldGroup: { marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#1f2937",
    marginBottom: 7,
  },
  required: { color: "#dc2626" },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1.5px solid #e5e7eb",
    borderRadius: 9,
    background: "#fff",
    padding: "0 14px",
    transition: "border-color 0.15s",
  },
  inputError: { borderColor: "#fca5a5" },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 13,
    color: "#111827",
    background: "transparent",
    padding: "11px 0",
    width: "100%",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },
  fieldError: {
    color: "#dc2626",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 0,
  },

  // about footer
  aboutFooter: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 5,
  },
  aboutHint: {
    fontSize: 11,
    color: "#b0b8c9",
    margin: 0,
  },

  // privacy
  privacyRow: {
    textAlign: "center",
    fontSize: 12,
    color: "#6b7280",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
    margin: "8px 0 12px",
  },

  // submit button
  submitBtn: {
    width: "100%",
    height: 52,
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(79, 70, 229, 0.30)",
  },
};
