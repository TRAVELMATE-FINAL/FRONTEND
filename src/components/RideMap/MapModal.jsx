// components/RideMap/MapModal.jsx
// Full-screen, in-app zoomable map popup. Opens when the user taps a ride's
// map preview. Reuses <RideMap interactive /> so the same route/markers are
// drawn, but with pinch-zoom (mobile) and scroll/±-button zoom (desktop).
//
// Closes on: the X button, a click on the dark backdrop, or the Esc key.
// Body scroll is locked while the modal is open so the page behind can't
// scroll on mobile.

import { useEffect } from "react";
import RideMap from "./RideMap";

export default function MapModal({ ride, open, onClose }) {
  // Esc-to-close + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const routeText =
    ride?.from && ride?.to ? `${ride.from} → ${ride.to}` : "Trip route";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ride route map"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 15, 30, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Panel — stop propagation so clicks inside don't close the modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(960px, 96vw)",
          height: "min(720px, 88vh)",
          background: "#0f1226",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span
            style={{
              color: "#e7e9f5",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {routeText}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close map"
            style={{
              flexShrink: 0,
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "none",
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Interactive map fills the rest of the panel */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <RideMap ride={ride} interactive />
        </div>
      </div>
    </div>
  );
}
