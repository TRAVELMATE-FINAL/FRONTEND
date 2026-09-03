// components/ConfirmModal/ConfirmModal.jsx
// A single professional confirmation modal reused across the app (Post Ride
// publish confirmation, Find Ride Pay Now confirmation, etc.). Responsive,
// closes on backdrop / Esc, and disables the confirm button while the action
// is processing to prevent double-submission.

import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function ConfirmModal({
  open,
  title,
  message,        // optional string
  rows,           // optional array of { label, value } detail rows
  note,           // optional small footnote string
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
  busy = false,   // disables the confirm button + shows a working state
  confirmBg = "#f5c518",
  confirmColor = "#111",
  hideCancel = false,   // single-button acknowledgement mode (e.g. success)
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !busy) onCancel && onCancel(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  // Render through a portal to <body> so the fixed overlay is always positioned
  // against the viewport — not trapped inside a transformed / sticky ancestor
  // (e.g. the sticky navbar), which was pinning the sign-out dialog to the top.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => { if (!busy) onCancel && onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(15, 15, 30, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(440px, 96vw)",
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 24px 60px rgba(10, 12, 50, 0.30)",
          overflow: "hidden",
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ padding: "22px 22px 6px" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1a1a4e", letterSpacing: "-0.01em" }}>
            {title}
          </h3>
          {message && (
            <p style={{ margin: "10px 0 0", fontSize: 14, color: "#5a5b7a", lineHeight: 1.6 }}>
              {message}
            </p>
          )}
        </div>

        {Array.isArray(rows) && rows.length > 0 && (
          <div style={{ margin: "14px 22px 4px", border: "1px solid #eceef6", borderRadius: 12, overflow: "hidden" }}>
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "flex", justifyContent: "space-between", gap: 12,
                  padding: "11px 14px", fontSize: 13.5,
                  background: i % 2 ? "#fafbff" : "#fff",
                }}
              >
                <span style={{ color: "#6b7090", fontWeight: 500 }}>{r.label}</span>
                <span style={{ color: "#1a1a4e", fontWeight: 700, textAlign: "right" }}>{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {note && (
          <p style={{ margin: "12px 22px 0", fontSize: 12, color: "#9ca0b8", lineHeight: 1.5 }}>{note}</p>
        )}

        <div style={{ display: "flex", gap: 10, padding: "18px 22px 22px" }}>
          {!hideCancel && (
            <button
              type="button"
              onClick={() => { if (!busy) onCancel && onCancel(); }}
              disabled={busy}
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 11,
                border: "1px solid #d7dae8", background: "#fff", color: "#374151",
                fontWeight: 700, fontSize: 14, cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => { if (!busy) onConfirm && onConfirm(); }}
            disabled={busy}
            style={{
              flex: 1.4, padding: "12px 14px", borderRadius: 11, border: "none",
              background: busy ? "#e5e7eb" : confirmBg, color: busy ? "#9ca0b8" : confirmColor,
              fontWeight: 800, fontSize: 14, cursor: busy ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              boxShadow: busy ? "none" : "0 6px 16px rgba(245, 197, 24, 0.30)",
            }}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
