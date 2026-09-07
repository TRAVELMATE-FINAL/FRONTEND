// components/BackButton/BackButton.jsx
// Lightweight, self-positioning back button for pages that don't render the
// global Header (login, OTP, onboarding). Fixed to the top-left; goes back in
// history, falling back to home.
import { useNavigate } from "react-router-dom";

export default function BackButton({ fallback = "/", style = {} }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        zIndex: 50,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "#fff",
        color: "#1a1a2e",
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        padding: "7px 13px 7px 9px",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(15,15,46,0.08)",
        ...style,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back
    </button>
  );
}
