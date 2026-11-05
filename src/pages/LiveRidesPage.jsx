// pages/LiveRidesPage.jsx
// Live Ride Sharing — standalone module.
//  • A host starts a live ride and shares the vehicle's real GPS location.
//  • Other verified members discover active rides, preview the live location,
//    pay for a seat (payment verified on the backend), and then follow the
//    same vehicle live on the map.
// Live updates use resilient HTTP polling (works on any host). Separate from
// the posted-ride / booking flow.

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import LiveMap from "../components/LiveMap/LiveMap.jsx";
import { loadRazorpay } from "../utils/razorpay";
import { checkUserActiveStatus } from "../services/api";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";
const getPhone = () => { try { return localStorage.getItem("phone") || ""; } catch { return ""; } };

const card = { background: "#fff", border: "1px solid #eceef6", borderRadius: 16, padding: 16, boxShadow: "0 4px 14px rgba(15,15,46,0.05)", marginBottom: 16 };
const label = { display: "block", fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 6px" };
const input = { width: "100%", height: 44, padding: "0 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, boxSizing: "border-box", background: "#fff", color: "#111827" };
const btnPrimary = { background: "#f5c518", color: "#111", border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const btnGhost = { background: "#fff", color: "#374151", border: "1px solid #d7dae8", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" };

function fmtAgo(d) {
  if (!d) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} hr ago`;
}

// Small live-tracking card (used for the host's ride and joined rides).
function TrackCard({ ride, phone, isHost, onStop }) {
  const [loc, setLoc] = useState({ lat: ride.currentLat, lon: ride.currentLon, destLat: ride.destLat, destLon: ride.destLon, lastLocationAt: ride.lastLocationAt, status: ride.status });
  const timerRef = useRef(null);

  // Poll the latest location every 8s (no page refresh).
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/live-rides/${ride._id}/location`, { params: { phone }, timeout: 8000 });
        if (!cancelled && data?.success) setLoc(data.data);
      } catch {}
    };
    poll();
    timerRef.current = setInterval(poll, 8000);
    return () => { cancelled = true; clearInterval(timerRef.current); };
  }, [ride._id, phone]);

  const ended = loc.status === "ended";
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800, color: "#1a1a2e", fontSize: 15 }}>{ride.from} → {ride.to}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {ride.vehicle?.type}{ride.vehicle?.model ? ` · ${ride.vehicle.model}` : ""}{ride.vehicle?.color ? ` · ${ride.vehicle.color}` : ""}
            {isHost ? " · You are hosting" : ""}
          </div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: ended ? "#991b1b" : "#166534", background: ended ? "#fee2e2" : "#dcfce7", padding: "4px 10px", borderRadius: 999 }}>
          {ended ? "Ended" : "● Live"}
        </span>
      </div>
      <LiveMap lat={loc.lat} lon={loc.lon} destLat={loc.destLat} destLon={loc.destLon} height={260} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Location updated {fmtAgo(loc.lastLocationAt)}</div>
        {isHost && !ended && (
          <button type="button" style={{ ...btnGhost, borderColor: "#fecaca", color: "#b91c1c" }} onClick={() => onStop(ride._id)}>
            Stop tracking &amp; end ride
          </button>
        )}
      </div>
    </div>
  );
}

export default function LiveRidesPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const focusId = sp.get("rideId") || "";   // deep-linked from Find Ride
  const phone = getPhone();
  const [rides, setRides] = useState([]);       // all active rides (discovery)
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [userActiveStatus, setUserActiveStatus] = useState(null);
  const watchRef = useRef(null);

  const myHostRide = rides.find((r) => r.isHost && r.status === "live");
  const myJoined = rides.filter((r) => r.joined && !r.isHost && r.status === "live");
  const available = rides.filter((r) => !r.isHost && !r.joined && r.status === "live" && r.availableSeats > 0);

  // When arriving from Find Ride (?rideId=…), scroll the matching live ride card
  // into view so the user can join it directly.
  useEffect(() => {
    if (!focusId) return;
    const el = typeof document !== "undefined" && document.getElementById(`live-${focusId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, available.length]);

  const load = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const uid = localStorage.getItem("userId") || "";
      const [{ data: liveData }, activeSt] = await Promise.all([
        axios.get(`${API_BASE}/api/live-rides`, { params: { phone }, timeout: 9000 }),
        checkUserActiveStatus(phone, uid).catch(() => null),
      ]);
      if (liveData?.success) setRides(liveData.data || []);
      if (activeSt) setUserActiveStatus(activeSt);
    } catch {} finally { setLoading(false); }
  }, [phone]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  // ── Host: push GPS to the backend continuously (resilient to drops). ──
  const startWatch = useCallback((rideId) => {
    if (!navigator.geolocation || watchRef.current != null) return;
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        axios.post(`${API_BASE}/api/live-rides/${rideId}/location`, { hostPhone: phone, lat: latitude, lon: longitude }, { timeout: 8000 })
          .catch(() => {/* brief network drop — keep watching, retry next fix */});
      },
      () => {/* temporary GPS error — don't stop; watch keeps trying */},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  }, [phone]);

  const stopWatch = useCallback(() => {
    if (watchRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
  }, []);

  // Resume pushing location if we're already hosting a live ride.
  useEffect(() => {
    if (myHostRide && watchRef.current == null) startWatch(myHostRide._id);
    return () => {};
  }, [myHostRide, startWatch]);
  useEffect(() => () => stopWatch(), [stopWatch]);

  const stopRide = async (rideId) => {
    try {
      await axios.post(`${API_BASE}/api/live-rides/${rideId}/stop`, { hostPhone: phone }, { timeout: 9000 });
      stopWatch();
      await load();
    } catch { setMsg("Could not stop the ride."); }
  };

  // ── Join a ride (pay for a seat). ──
  const joinRide = async (ride) => {
    setMsg("");
    if (!phone) { navigate("/login"); return; }
    if (userActiveStatus?.hasActiveCreatedRide) {
      setMsg("You have already started a ride. You cannot join another ride until your current ride is completed or cancelled.");
      return;
    }
    if (userActiveStatus?.hasActiveJoinedRide && String(userActiveStatus.activeJoinedRide?.rideId) !== String(ride._id)) {
      setMsg("You have already joined an active ride. You cannot join another ride until your current ride is completed or cancelled.");
      return;
    }

    setBusy(true);
    const uid = localStorage.getItem("userId") || "";
    try {
      await loadRazorpay();
      const { data: order } = await axios.post(`${API_BASE}/api/live-rides/${ride._id}/join-order`, {
        riderPhone: phone,
        riderUserId: uid,
        userId: uid,
      }, { timeout: 12000 });
      if (!order?.orderId) throw new Error(order?.message || "Could not start payment");
      const rzp = new window.Razorpay({
        key: order.key, amount: order.amount, currency: order.currency || "INR", order_id: order.orderId,
        name: "Vooggly", description: `Live ride seat · ${ride.from} → ${ride.to}`,
        theme: { color: "#f5c518" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (resp) => {
          try {
            const { data: v } = await axios.post(`${API_BASE}/api/live-rides/${ride._id}/join-verify`, {
              riderPhone: phone,
              riderUserId: uid,
              userId: uid,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }, { timeout: 12000 });
            if (v?.success) { setMsg("✅ Seat confirmed! You can now track this ride live below."); await load(); }
            else { setMsg(v?.message || "Could not confirm your seat."); }
          } catch (e) {
            setMsg(e.response?.data?.message || "Payment verification failed. If charged, you'll be refunded.");
          }
          finally { setBusy(false); }
        },
      });
      rzp.on("payment.failed", () => { setMsg("Payment failed. Please try again."); setBusy(false); });
      rzp.open();
    } catch (e) {
      if (e.response?.data?.code === "ACTIVE_RIDE_EXISTS" || e.response?.data?.code === "ACTIVE_JOINED_RIDE_EXISTS") {
        setMsg(e.response?.data?.message || "You have already started a ride. You cannot join another ride until your current ride is completed or cancelled.");
      } else {
        setMsg(e.response?.data?.message || "Could not start the booking.");
      }
      setBusy(false);
    }
  };

  if (!phone) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--tm-internal-bg,#f3f0fb)", display: "flex", flexDirection: "column" }}>
        <Header />
        <div style={{ flex: 1, maxWidth: 560, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 22, color: "#1a1a2e" }}>Live Ride Sharing</h1>
          <p style={{ color: "#6b7280" }}>Please log in to start or join a live ride.</p>
          <button style={btnPrimary} onClick={() => navigate("/login")}>Login</button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--tm-internal-bg,#f3f0fb)", display: "flex", flexDirection: "column" }}>
      <Header />
      <div style={{ flex: 1, width: "100%", maxWidth: 820, margin: "0 auto", padding: "20px 14px 48px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", margin: "6px 0 2px" }}>Live Ride Sharing</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 16px" }}>
          Share your vehicle's live location, or join an ongoing ride and follow it on the map.
        </p>

        {msg && (
          <div style={{ ...card, background: "#f0f9ff", border: "1px solid #bae6fd", color: "#075985", fontSize: 14, fontWeight: 600 }}>{msg}</div>
        )}

        {/* Host's own live ride */}
        {myHostRide && <TrackCard ride={myHostRide} phone={phone} isHost onStop={stopRide} />}

        {/* Active created ride banner */}
        {(userActiveStatus?.hasActiveCreatedRide || myHostRide) && (
          <div style={{ ...card, background: "#fff7ed", border: "1.5px solid #fed7aa" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, color: "#9a3412", fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>⚠️</span> Active Ride in Progress
                </div>
                <div style={{ fontSize: 13, color: "#c2410c", marginTop: 4 }}>
                  You have already started a ride. You cannot join another ride until your current ride is completed or cancelled.
                </div>
              </div>
              <button
                type="button"
                style={{ ...btnPrimary, background: "#ea580c", color: "#fff" }}
                onClick={() => navigate(`/ride-live?rideId=${userActiveStatus?.activeCreatedRide?._id || userActiveStatus?.activeCreatedRide?.rideId || myHostRide?._id || ""}`)}
              >
                View Active Ride →
              </button>
            </div>
          </div>
        )}

        {/* Start a ride via Post Ride form */}
        {!myHostRide && !userActiveStatus?.hasActiveCreatedRide && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, color: "#111827", fontSize: 15 }}>🚗 Start a Ride</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  Use the Post Ride form to create your trip with full ride-sharing and live location tracking.
                </div>
              </div>
              <button type="button" style={btnPrimary} onClick={() => navigate("/post-ride")}>
                Post a Ride →
              </button>
            </div>
          </div>
        )}

        {/* Rides I've joined */}
        {myJoined.length > 0 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#374151", margin: "8px 2px 6px" }}>Rides you've joined</div>
            {myJoined.map((r) => <TrackCard key={r._id} ride={r} phone={phone} isHost={false} onStop={() => {}} />)}
          </>
        )}

        {/* Discovery */}
        <div style={{ fontSize: 14, fontWeight: 800, color: "#374151", margin: "14px 2px 6px" }}>Available live rides</div>
        {loading ? (
          <div style={{ ...card, textAlign: "center", color: "#6b7280" }}>Loading…</div>
        ) : available.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: "#6b7280" }}>No live rides available right now.</div>
        ) : (
          available.map((r) => (
            <div key={r._id} id={`live-${r._id}`} style={
              String(r._id) === String(focusId)
                ? { borderRadius: 16, boxShadow: "0 0 0 3px rgba(22,163,74,0.5)" }
                : undefined
            }>
              <AvailableCard ride={r} phone={phone} busy={busy} onJoin={joinRide} userActiveStatus={userActiveStatus} />
            </div>
          ))
        )}
      </div>
      <Footer />
    </div>
  );
}

// Discovery card with a "View live location" preview + Join (pay).
function AvailableCard({ ride, phone, busy, onJoin, userActiveStatus }) {
  const [showMap, setShowMap] = useState(false);
  const [loc, setLoc] = useState({ lat: ride.currentLat, lon: ride.currentLon, destLat: ride.destLat, destLon: ride.destLon, lastLocationAt: ride.lastLocationAt });
  const timerRef = useRef(null);

  useEffect(() => {
    if (!showMap) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/live-rides/${ride._id}/location`, { params: { phone }, timeout: 8000 });
        if (!cancelled && data?.success) setLoc(data.data);
      } catch {}
    };
    poll(); timerRef.current = setInterval(poll, 8000);
    return () => { cancelled = true; clearInterval(timerRef.current); };
  }, [showMap, ride._id, phone]);

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: "#1a1a2e", fontSize: 15 }}>{ride.from} → {ride.to}</div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
            {ride.vehicle?.type}{ride.vehicle?.model ? ` · ${ride.vehicle.model}` : ""}{ride.vehicle?.color ? ` · ${ride.vehicle.color}` : ""}
            {ride.hostName ? ` · Host: ${ride.hostName}` : ""}
          </div>
          <div style={{ fontSize: 12.5, color: "#4b5563", marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap" }}>
            {ride.departureTime && <span>🕒 {ride.departureTime}</span>}
            <span>💺 {ride.availableSeats} seat{ride.availableSeats === 1 ? "" : "s"} left</span>
            <span style={{ fontWeight: 800, color: "#7c3aed" }}>₹{ride.farePerSeat}/seat</span>
          </div>
        </div>
      </div>
      {showMap && (
        <div style={{ marginTop: 12 }}>
          <LiveMap lat={loc.lat} lon={loc.lon} destLat={loc.destLat} destLon={loc.destLon} height={220} />
          <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 6 }}>Live location — updated {fmtAgo(loc.lastLocationAt)}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" style={btnGhost} onClick={() => setShowMap((s) => !s)}>
          {showMap ? "Hide live location" : "👁 View live location"}
        </button>
        {userActiveStatus?.hasActiveCreatedRide ? (
          <button
            type="button"
            style={{ ...btnPrimary, flex: 1, minWidth: 140, background: "#ffedd5", color: "#c2410c", border: "1px solid #fed7aa", cursor: "not-allowed" }}
            disabled
            title="You have already started a ride. You cannot join another ride until your current ride is completed or cancelled."
          >
            ⚠️ Ride Active
          </button>
        ) : (
          <button type="button" style={{ ...btnPrimary, flex: 1, minWidth: 140 }} disabled={busy} onClick={() => onJoin(ride)}>
            {busy ? "Please wait…" : `Join ride · ₹${ride.farePerSeat}`}
          </button>
        )}
      </div>
    </div>
  );
}
