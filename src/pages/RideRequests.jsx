import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

const STATUS_STYLE = {
  pending:   { bg: "#fef9c3", fg: "#854d0e", label: "Pending" },
  accepted:  { bg: "#dcfce7", fg: "#166534", label: "Confirmed" },
  rejected:  { bg: "#fee2e2", fg: "#991b1b", label: "Rejected" },
  cancelled: { bg: "#e5e7eb", fg: "#374151", label: "Cancelled" },
  expired:   { bg: "#e5e7eb", fg: "#6b7280", label: "Expired" },
};

function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ background: s.bg, color: s.fg, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
      {s.label}
    </span>
  );
}

export default function RideRequests() {
  const navigate = useNavigate();
  const phone = (() => { try { return localStorage.getItem("phone") || ""; } catch { return ""; } })();
  const [tab, setTab] = useState("received");
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    setLoading(true);
    try {
      const [inc, out] = await Promise.all([
        axios.get(`${API_BASE}/api/rides/requests/incoming`, { params: { phone } }),
        axios.get(`${API_BASE}/api/rides/requests/outgoing`, { params: { phone } }),
      ]);
      setIncoming(inc.data?.data || []);
      setOutgoing(out.data?.data || []);
    } catch (e) {
      setMsg("Could not load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => { load(); }, [load]);

  const act = async (path, body, id) => {
    setBusy(id); setMsg("");
    try {
      await axios.post(`${API_BASE}${path}`, body);
      await load();
    } catch (e) {
      setMsg(e.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const routeText = (r) => (r.ride ? `${r.ride.from} → ${r.ride.to}` : "Ride");
  const whenText = (r) => (r.ride ? `${r.ride.date || ""} ${r.ride.time || ""}`.trim() : "");

  const card = (children) => (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, marginBottom: 12 }}>{children}</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f8", overflowX: "hidden" }}>
      <Header />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 60px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0b1c30", margin: "0 0 4px" }}>Ride Requests</h1>
        <p style={{ color: "#6b7280", margin: "0 0 18px", fontSize: 14 }}>
          Requests you received on your rides, and requests you've sent.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["received", "sent"].map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 14,
              background: tab === t ? "#f5c518" : "#fff",
              color: tab === t ? "#111" : "#374151",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {t === "received" ? `Received (${incoming.length})` : `Sent (${outgoing.length})`}
            </button>
          ))}
        </div>

        {msg && <div style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 }}>{msg}</div>}

        {!phone && (
          <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>
            Please log in to see your ride requests.
          </div>
        )}

        {phone && loading && <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>Loading…</div>}

        {/* RECEIVED — owner accepts / rejects */}
        {phone && !loading && tab === "received" && (
          incoming.length === 0
            ? <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>No requests yet.</div>
            : incoming.map((r) => card(
                <div key={r._id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "#0b1c30" }}>{r.rider?.name || "A rider"}</div>
                    <Badge status={r.status} />
                  </div>
                  {r.rider?.city && <div style={{ color: "#6b7280", fontSize: 13 }}>{r.rider.city}</div>}
                  <div style={{ marginTop: 6, fontSize: 14, color: "#374151" }}>{routeText(r)}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{whenText(r)}</div>
                  {r.message && <div style={{ marginTop: 6, fontSize: 13, color: "#4b5563", fontStyle: "italic" }}>“{r.message}”</div>}

                  {r.status === "accepted" && r.rider?.phone && (
                    <div style={{ marginTop: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 10, fontSize: 14 }}>
                      Confirmed ✓ — Rider contact: <a href={`tel:${r.rider.phone}`} style={{ fontWeight: 700, color: "#166534" }}>{r.rider.phone}</a>
                    </div>
                  )}

                  {r.status === "pending" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button disabled={busy === r._id} onClick={() => act(`/api/rides/requests/${r._id}/accept`, { ownerPhone: phone }, r._id)}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                        Accept
                      </button>
                      <button disabled={busy === r._id} onClick={() => act(`/api/rides/requests/${r._id}/reject`, { ownerPhone: phone }, r._id)}
                        style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #ef4444", background: "#fff", color: "#ef4444", fontWeight: 700, cursor: "pointer" }}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
        )}

        {/* SENT — rider sees status, contact when accepted, cancel */}
        {phone && !loading && tab === "sent" && (
          outgoing.length === 0
            ? <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>You haven't requested any rides yet.</div>
            : outgoing.map((r) => card(
                <div key={r._id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "#0b1c30" }}>{routeText(r)}</div>
                    <Badge status={r.status} />
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{whenText(r)}</div>

                  {r.status === "accepted" && r.paymentStatus === "paid" && r.owner?.phone && (
                    <div style={{ marginTop: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 10, fontSize: 14 }}>
                      Confirmed ✓ • Paid — {r.owner.name}: <a href={`tel:${r.owner.phone}`} style={{ fontWeight: 700, color: "#166534" }}>{r.owner.phone}</a>
                    </div>
                  )}

                  {r.status === "accepted" && r.paymentStatus !== "paid" && (
                    <div style={{ marginTop: 10, background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 10, padding: 12, fontSize: 14 }}>
                      <div style={{ fontWeight: 700, color: "#4338ca", marginBottom: 2 }}>Booking confirmed</div>
                      <div style={{ color: "#4b5563", marginBottom: 10 }}>Payment pending — complete payment to finalize your booking and view contact details.</div>
                      <button
                        type="button"
                        onClick={() => navigate(`/ride-detail?rideId=${r.ride?._id || ""}&pay=1`)}
                        style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "#f5c518", color: "#111", fontWeight: 700, cursor: "pointer" }}>
                        Pay now
                      </button>
                    </div>
                  )}

                  {r.status === "pending" && (
                    <button disabled={busy === r._id} onClick={() => act(`/api/rides/requests/${r._id}/cancel`, { riderPhone: phone }, r._id)}
                      style={{ marginTop: 12, padding: "9px 16px", borderRadius: 10, border: "1px solid #9ca3af", background: "#fff", color: "#374151", fontWeight: 700, cursor: "pointer" }}>
                      Cancel request
                    </button>
                  )}
                </div>
              ))
        )}
      </div>
      <Footer />
    </div>
  );
}
