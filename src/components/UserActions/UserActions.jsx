import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./UserActions.css";

const API_BASE =
  import.meta.env.VITE_APP_URL ||
  "https://travelmate-backend-dzpq.onrender.com";

/* Report reasons — same set rendered on the Figma "Report User" modal. */
const REPORT_REASONS = [
  "Spam",
  "Inappropriate behavior",
  "Safety concern",
  "Other",
];

/**
 * UserActions — the kebab (⋮) menu shown on a driver/rider profile card.
 *
 * Props:
 *   targetPhone (string, required) — phone of the user being reported/blocked
 *   targetName  (string, optional) — used in confirmation copy
 *   className   (string, optional) — passed to the outer wrapper for layout
 *   onBlocked   (function, optional) — fires when block succeeds
 *
 * The viewer's own phone is read from localStorage. If they aren't logged in
 * we still let them open the menu but block + report APIs will gate them.
 */
export default function UserActions({
  targetPhone,
  targetName = "this user",
  className = "",
  onBlocked,
}) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'report' | 'reported' | 'block' | 'blocked' | null
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const wrapRef = useRef(null);

  // Close the menu when the user clicks outside it
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const viewerPhone =
    (typeof window !== "undefined" && localStorage.getItem("phone")) || "";

  const resetModal = () => {
    setModal(null);
    setReason("");
    setDetails("");
    setErr("");
    setBusy(false);
  };

  const submitReport = async () => {
    setErr("");
    if (!reason) {
      setErr("Please pick a reason.");
      return;
    }
    if (!viewerPhone) {
      setErr("You must be logged in to report a user.");
      return;
    }
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
      setErr(
        e?.response?.data?.message || e.message || "Failed to submit report."
      );
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    setErr("");
    if (!viewerPhone) {
      setErr("You must be logged in to block a user.");
      return;
    }
    try {
      setBusy(true);
      await axios.post(`${API_BASE}/api/users/block`, {
        blockerPhone: viewerPhone,
        blockedPhone: targetPhone,
      });
      setModal("blocked");
      if (typeof onBlocked === "function") onBlocked(targetPhone);
    } catch (e) {
      setErr(
        e?.response?.data?.message || e.message || "Failed to block user."
      );
    } finally {
      setBusy(false);
    }
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
      setErr(
        e?.response?.data?.message || e.message || "Failed to undo block."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapRef} className={`ua-wrap ${className}`}>
      {/* Kebab (⋮) trigger */}
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

      {/* Dropdown menu — Report user / Block user */}
      {open && (
        <div className="ua-menu" role="menu">
          <button
            type="button"
            className="ua-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setModal("report");
            }}
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
            onClick={() => {
              setOpen(false);
              setModal("block");
            }}
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

      {/* ── Modal: Report User ── */}
      {modal === "report" && (
        <Backdrop onClose={resetModal}>
          <div className="ua-modal">
            <div className="ua-modal-head">
              <h3 className="ua-modal-title">Report User</h3>
              <button
                type="button"
                className="ua-close"
                aria-label="Close"
                onClick={resetModal}
              >
                ×
              </button>
            </div>
            <p className="ua-modal-sub">Why are you reporting?</p>

            <div className="ua-reasons">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="ua-reason">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  <span className="ua-reason-text">{r}</span>
                </label>
              ))}
            </div>

            <label className="ua-textlabel">
              Additional details (optional)
            </label>
            <textarea
              className="ua-textarea"
              rows={3}
              maxLength={400}
              placeholder="Please provide any additional context about this report..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />

            {err && <div className="ua-err">{err}</div>}

            <div className="ua-actions">
              <button
                type="button"
                className="ua-btn ua-btn--ghost"
                onClick={resetModal}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ua-btn ua-btn--primary"
                onClick={submitReport}
                disabled={busy}
              >
                {busy ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </div>
        </Backdrop>
      )}

      {/* ── Modal: Report Submitted ── */}
      {modal === "reported" && (
        <Backdrop onClose={resetModal}>
          <div className="ua-modal ua-modal--centered">
            <div className="ua-success-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="ua-modal-title">Report submitted</h3>
            <p className="ua-modal-text">
              Thanks for helping keep the community safe.
            </p>
            <div className="ua-info">
              <strong>What's next?</strong>
              <br />
              Our moderation team will review the details within 24 hours.
              You'll receive a notification once an action is taken.
            </div>
            <button
              type="button"
              className="ua-btn ua-btn--primary ua-btn--block"
              onClick={resetModal}
            >
              Done
            </button>
          </div>
        </Backdrop>
      )}

      {/* ── Modal: Block User confirmation ── */}
      {modal === "block" && (
        <Backdrop onClose={resetModal}>
          <div className="ua-modal ua-modal--centered">
            <div className="ua-danger-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M5.5 5.5l13 13" />
              </svg>
            </div>
            <h3 className="ua-modal-title">Block {targetName}?</h3>
            <p className="ua-modal-text">
              You won't see any rides or messages from this user.
              You can unblock them later from your profile settings.
            </p>

            {err && <div className="ua-err">{err}</div>}

            <div className="ua-actions">
              <button
                type="button"
                className="ua-btn ua-btn--ghost"
                onClick={resetModal}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ua-btn ua-btn--danger"
                onClick={submitBlock}
                disabled={busy}
              >
                {busy ? "Blocking…" : "Block User"}
              </button>
            </div>
          </div>
        </Backdrop>
      )}

      {/* ── Modal: User Blocked confirmation ── */}
      {modal === "blocked" && (
        <Backdrop onClose={resetModal}>
          <div className="ua-modal ua-modal--centered">
            <div className="ua-shield-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l8 4v6c0 5-3.5 9.4-8 11-4.5-1.6-8-6-8-11V6l8-4z" />
              </svg>
            </div>
            <h3 className="ua-modal-title">User blocked</h3>
            <p className="ua-modal-text">
              You won't see content from this user anymore.
            </p>

            {err && <div className="ua-err">{err}</div>}

            <button
              type="button"
              className="ua-btn ua-btn--primary ua-btn--block"
              onClick={resetModal}
            >
              Done
            </button>
            <button
              type="button"
              className="ua-undo"
              onClick={undoBlock}
              disabled={busy}
            >
              Undo action
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

/* Click-outside backdrop. We deliberately render OUTSIDE the wrapRef so
   the kebab's "click outside to close" doesn't interfere with modals. */
function Backdrop({ children, onClose }) {
  return (
    <div
      className="ua-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
