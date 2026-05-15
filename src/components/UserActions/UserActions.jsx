import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./UserActions.css";

const API_BASE =
  import.meta.env.VITE_APP_URL ||
  "https://travelmate-backend-dzpq.onrender.com";

/* Figma reasons — in this exact order */
const REPORT_REASONS = [
  "Spam",
  "Fake profile",
  "Inappropriate behavior",
  "Safety concern",
  "Other",
];

/**
 * UserActions — kebab menu + Report/Block modals.
 * Used on RideDetail.jsx and ConnectUnlock.jsx on the driver card.
 */
export default function UserActions({
  targetPhone,
  targetName = "this user",
  className = "",
  onBlocked,
}) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const viewerPhone =
    (typeof window !== "undefined" && localStorage.getItem("phone")) || "";

  const resetModal = () => {
    setModal(null); setReason(""); setDetails(""); setErr(""); setBusy(false);
  };

  const submitReport = async () => {
    setErr("");
    if (!reason) { setErr("Please pick a reason."); return; }
    if (!viewerPhone) { setErr("You must be logged in to report a user."); return; }
    try {
      setBusy(true);
      await axios.post(`${API_BASE}/api/users/report`, {
        reporterPhone: viewerPhone,
        reportedPhone: targetPhone,
        reason,
        details: details.trim(),
      });
      setModal("reported");
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to submit report.");
    } finally { setBusy(false); }
  };

  const submitBlock = async () => {
    setErr("");
    if (!viewerPhone) { setErr("You must be logged in to block a user."); return; }
    try {
      setBusy(true);
      await axios.post(`${API_BASE}/api/users/block`, {
        blockerPhone: viewerPhone,
        blockedPhone: targetPhone,
      });
      setModal("blocked");
      if (typeof onBlocked === "function") onBlocked(targetPhone);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to block user.");
    } finally { setBusy(false); }
  };

  const undoBlock = async () => {
    try {
      setBusy(true);
      await axios.delete(
        `${API_BASE}/api/users/block/${encodeURIComponent(targetPhone)}`,
        { data: { blockerPhone: viewerPhone } }
      );
      resetModal();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to undo block.");
    } finally { setBusy(false); }
  };

  return (
    <div ref={wrapRef} className={`ua-wrap ${className}`}>
      <button
        type="button"
        className="ua-kebab"
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="4.5" r="1.6" fill="#6b7280" />
          <circle cx="10" cy="10" r="1.6" fill="#6b7280" />
          <circle cx="10" cy="15.5" r="1.6" fill="#6b7280" />
        </svg>
      </button>

      {open && (
        <div className="ua-menu" role="menu">
          <button
            type="button"
            className="ua-menu-item"
            role="menuitem"
            onClick={() => { setOpen(false); setModal("report"); }}
          >
            <span className="ua-menu-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 22V4M4 4h12l-2 4 2 4H4" />
              </svg>
            </span>
            Report user
          </button>
          <button
            type="button"
            className="ua-menu-item ua-menu-item--danger"
            role="menuitem"
            onClick={() => { setOpen(false); setModal("block"); }}
          >
            <span className="ua-menu-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M5.5 5.5l13 13" />
              </svg>
            </span>
            Block user
          </button>
        </div>
      )}

      {/* ── Report User modal — Figma match ── */}
      {modal === "report" && (
        <Backdrop onClose={resetModal}>
          <div className="ua-modal">
            <div className="ua-modal-head">
              <div>
                <h3 className="ua-modal-title">Report User</h3>
                <p className="ua-modal-sub">We prioritize your safety and privacy.</p>
              </div>
              <button type="button" className="ua-close" aria-label="Close" onClick={resetModal}>×</button>
            </div>

            <p className="ua-question">Why are you reporting?</p>

            <div className="ua-reasons">
              {REPORT_REASONS.map((r) => {
                const active = reason === r;
                return (
                  <label key={r} className={`ua-reason ${active ? "ua-reason--active" : ""}`}>
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={active}
                      onChange={() => setReason(r)}
                    />
                    <span className="ua-reason-dot" aria-hidden />
                    <span className="ua-reason-text">{r}</span>
                  </label>
                );
              })}
            </div>

            <label className="ua-textlabel">Additional details <span className="ua-optional">(Optional)</span></label>
            <textarea
              className="ua-textarea"
              rows={3}
              maxLength={400}
              placeholder="Please provide any context that helps us understand the situation better."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />

            {/* Trust & safety banner — light blue with shield icon */}
            <div className="ua-trust">
              <span className="ua-trust-icon" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 4v6c0 5-3.5 9.4-8 11-4.5-1.6-8-6-8-11V6l8-4z" />
                </svg>
              </span>
              <span className="ua-trust-text">
                Our trust and safety team will review your report manually. This helps keep our community safe for everyone.
              </span>
            </div>

            {err && <div className="ua-err">{err}</div>}

            <div className="ua-actions">
              <button type="button" className="ua-btn ua-btn--primary" onClick={submitReport} disabled={busy}>
                {busy ? "Submitting…" : "Submit Report"}
              </button>
              <button type="button" className="ua-btn ua-btn--ghost" onClick={resetModal} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        </Backdrop>
      )}

      {/* ── Report Submitted ── */}
      {modal === "reported" && (
        <Backdrop onClose={resetModal}>
          <div className="ua-modal ua-modal--centered">
            <div className="ua-success-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="ua-modal-title">Report submitted</h3>
            <p className="ua-modal-text">Thanks for helping keep the community safe</p>

            <div className="ua-next">
              <span className="ua-next-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </span>
              <div className="ua-next-body">
                <strong>What's next?</strong><br />
                Our moderation team will review the details within 24 hours. You'll receive a notification once an action is taken.
              </div>
            </div>

            <button type="button" className="ua-btn ua-btn--primary ua-btn--block" onClick={resetModal}>
              Done
            </button>

            <p className="ua-fine">This action contributes to our global trust and safety standard.</p>
          </div>
        </Backdrop>
      )}

      {/* ── Block confirmation ── */}
      {modal === "block" && (
        <Backdrop onClose={resetModal}>
          <div className="ua-modal ua-modal--centered">
            <div className="ua-shield-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l8 4v6c0 5-3.5 9.4-8 11-4.5-1.6-8-6-8-11V6l8-4z" />
              </svg>
            </div>
            <h3 className="ua-modal-title">Block {targetName}?</h3>
            <p className="ua-modal-text">
              You won't see any rides or messages from this user. You can unblock them later from your profile settings.
            </p>

            {err && <div className="ua-err">{err}</div>}

            <div className="ua-actions">
              <button type="button" className="ua-btn ua-btn--danger" onClick={submitBlock} disabled={busy}>
                {busy ? "Blocking…" : "Block User"}
              </button>
              <button type="button" className="ua-btn ua-btn--ghost" onClick={resetModal} disabled={busy}>
                Cancel
              </button>
            </div>
          </div>
        </Backdrop>
      )}

      {/* ── User blocked confirmation — BLUE shield, yellow Done ── */}
      {modal === "blocked" && (
        <Backdrop onClose={resetModal}>
          <div className="ua-modal ua-modal--centered">
            <div className="ua-shield-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l8 4v6c0 5-3.5 9.4-8 11-4.5-1.6-8-6-8-11V6l8-4z" />
              </svg>
            </div>
            <h3 className="ua-modal-title">User blocked</h3>
            <p className="ua-modal-text">You won't see content from this user anymore</p>

            {err && <div className="ua-err">{err}</div>}

            <button type="button" className="ua-btn ua-btn--primary ua-btn--block" onClick={resetModal}>
              Done
            </button>
            <button type="button" className="ua-undo" onClick={undoBlock} disabled={busy}>
              ↶ Undo action
            </button>
            <p className="ua-fine">
              This update may take a few minutes to reflect across all features.
            </p>
          </div>
        </Backdrop>
      )}
    </div>
  );
}

function Backdrop({ children, onClose }) {
  return (
    <div
      className="ua-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}
