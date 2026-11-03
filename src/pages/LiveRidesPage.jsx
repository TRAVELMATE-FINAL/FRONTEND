// pages/LiveRidesPage.jsx
// Live Ride Sharing — standalone module.
//  • A host starts a live ride and shares the vehicle's real GPS location.
//  • Other verified members discover active rides, preview the live location,
//    pay for a seat (payment verified on the backend), and then follow the
//    same vehicle live on the map.
// Live updates use resilient HTTP polling (works on any host). Separate from
// the posted-ride / booking flow.

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import LiveMap from "../components/LiveMap/LiveMap.jsx";
import { loadRazorpay } from "../utils/razorpay";

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
  const phone = getPhone();
  const [rides, setRides] = useState([]);       // all active rides (discovery)
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [form, setForm] = useState({ vehicleType: "Car", vehicleModel: "", vehicleColor: "", plateNumber: "", from: "", to: "", departureTime: "", totalSeats: 4, farePerSeat: "" });
  const watchRef = useRef(null);

  const myHostRide = rides.find((r) => r.isHost && r.status === "live");
  const myJoined = rides.filter((r) => r.joined && !r.isHost && r.status === "live");
  const available = rides.filter((r) => !r.isHost && !r.joined && r.status === "live" && r.availableSeats > 0);

  const load = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    try {
      const { data } = await axios.get(`${API_BASE}/api/live-rides`, { params: { phone }, timeout: 9000 });
      if (data?.success) setRides(data.data || []);
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

  // ── Start a new live ride (requests GPS permission). ──
  const startRide = () => {
    setMsg("");
    if (!phone) { navigate("/login"); return; }
    if (!form.from.trim() || !form.to.trim()) { setMsg("Enter where you're starting from and going to."); return; }
    if (!(Number(form.totalSeats) >= 1)) { setMsg("Enter the number of seats."); return; }
    if (form.farePerSeat === "" || Number(form.farePerSeat) < 0) { setMsg("Enter the per-seat sharing amount."); return; }
    if (!navigator.geolocation) { setMsg("Your device/browser doesn't support location."); return; }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const { data } = await axios.post(`${API_BASE}/api/live-rides`, {
            hostPhone: phone,
            vehicleType: form.vehicleType, vehicleModel: form.vehicleModel, vehicleColor: form.vehicleColor, plateNumber: form.plateNumber,
            from: form.from, to: form.to, departureTime: form.departureTime,
            totalSeats: Number(form.totalSeats), farePerSeat: Number(form.farePerSeat),
            lat: latitude, lon: longitude,
          }, { timeout: 10000 });
          if (data?.success) {
            setShowStart(false);
            await load();
            startWatch(data.data._id);
          } else { setMsg(data?.message || "Could not start the ride."); }
        } catch (e) {
          setMsg(e.response?.data?.message || "Could not start the ride.");
        } finally { setBusy(false); }
      },
      () => { setBusy(false); setMsg("Location permission is required to start live tracking. Please allow location access."); },
      { enableHighAccuracy: true, timeout: 20000 }
    );
  };

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
    setBusy(true);
    try {
      await loadRazorpay();
      const { data: order } = await axios.post(`${API_BASE}/api/live-rides/${ride._id}/join-order`, { riderPhone: phone }, { timeout: 12000 });
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
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }, { timeout: 12000 });
            if (v?.success) { setMsg("✅ Seat confirmed! You can now track this ride live below."); await load(); }
            else { setMsg(v?.message || "Could not confirm your seat."); }
          } catch (e) { setMsg(e.response?.data?.message || "Payment verification failed. If charged, you'll be refunded."); }
          finally { setBusy(false); }
        },
      });
      rzp.on("payment.failed", () => { setMsg("Payment failed. Please try again."); setBusy(false); });
      rzp.open();
    } catch (e) {
      setMsg(e.response?.data?.message || "Could not start the booking.");
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

        {/* Start a live ride (only if not already hosting) */}
        {!myHostRide && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowStart((s) => !s)}>
              <div style={{ fontWeight: 800, color: "#111827", fontSize: 15 }}>🚗 Start a live ride</div>
              <span style={{ color: "#7c3aed", fontWeight: 700, fontSize: 13 }}>{showStart ? "Close" : "Start"}</span>
            </div>
            {showStart && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 160px" }}><label style={label}>Vehicle type</label>
                    <select style={input} value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                      <option>Car</option><option>Bike</option><option>Van</option>
                    </select>
                  </div>
                  <div style={{ flex: "1 1 160px" }}><label style={label}>Vehicle name</label>
                    <input style={input} value={form.vehicleModel} onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })} placeholder="e.g. Swift" /></div>
                  <div style={{ flex: "1 1 120px" }}><label style={label}>Color</label>
                    <input style={input} value={form.vehicleColor} onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })} placeholder="White" /></div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  <div style={{ flex: "1 1 200px" }}><label style={label}>From</label>
                    <input style={input} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} placeholder="Starting point" /></div>
                  <div style={{ flex: "1 1 200px" }}><label style={label}>To</label>
                    <input style={input} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="Destination" /></div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  <div style={{ flex: "1 1 120px" }}><label style={label}>Departure time</label>
                    <input style={input} value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} placeholder="e.g. 6:30 PM" /></div>
                  <div style={{ flex: "1 1 100px" }}><label style={label}>Total seats</label>
                    <input style={input} type="number" min={1} max={20} value={form.totalSeats} onChange={(e) => setForm({ ...form, totalSeats: e.target.value })} /></div>
                  <div style={{ flex: "1 1 120px" }}><label style={label}>₹ per seat</label>
                    <input style={input} type="number" min={0} value={form.farePerSeat} onChange={(e) => setForm({ ...form, farePerSeat: e.target.value })} placeholder="0" /></div>
                </div>
                <button type="button" style={{ ...btnPrimary, marginTop: 14, width: "100%" }} disabled={busy} onClick={startRide}>
                  {busy ? "Starting…" : "Allow location & Start tracking"}
                </button>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                  You'll be asked to allow location access. Your live GPS is shared only while the ride is active.
                </div>
              </div>
            )}
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
          available.map((r) => <AvailableCard key={r._id} ride={r} phone={phone} busy={busy} onJoin={joinRide} />)
        )}
      </div>
      <Footer />
    </div>
  );
}

// Discovery card with a "View live location" preview + Join (pay).
function AvailableCard({ ride, phone, busy, onJoin }) {
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
        <button type="button" style={{ ...btnPrimary, flex: 1, minWidth: 140 }} disabled={busy} onClick={() => onJoin(ride)}>
          {busy ? "Please wait…" : `Join ride · ₹${ride.farePerSeat}`}
        </button>
      </div>
    </div>
  );
}
