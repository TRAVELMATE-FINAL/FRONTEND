import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Spinner from "../components/Spinner/Spinner.jsx";
import Header from "../components/Header/Header.jsx";
import Footer from "../components/Footer/Footer.jsx";
import { formatTime12h } from "../utils/time.js";

const API_BASE = import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

// "2026-05-08" + "06:00" → "8 May, 6:00 AM" / "Today" / "Tomorrow"
function formatDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
  if (sameDay)    return "Today";
  if (isTomorrow) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Re-export the shared 12-hour formatter under the local name so the rest
// of the file keeps reading naturally.
const formatTime = formatTime12h;

export default function RideLive() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Prefer rideId in the URL, else fall back to the last-posted id from localStorage
  const rideId = searchParams.get("rideId") || localStorage.getItem("lastPostedRideId") || "";

  const [ride, setRide] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rideId) {
      setLoading(false);
      setError("No ride found. Post a new ride to see it live.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(API_BASE + "/api/rides/" + rideId + "/connect");
        if (cancelled) return;
        setRide(data?.data?.ride || null);
        setUser(data?.data?.user || null);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || "Could not load ride details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rideId]);

  const fromCity   = ride?.from || "—";
  const toCity     = ride?.to   || "—";
  const dateLabel  = formatDate(ride?.date);
  const timeLabel  = formatTime(ride?.time);
  const seats      = typeof ride?.seatsAvailable === "number" ? ride.seatsAvailable : 0;
  const driverName = user?.fullName?.trim() || "Your ride";

  const handleViewRide = () => {
    // View Ride takes the rider to their own profile & posted-rides
    // page so they can see / manage everything they've published.
    navigate("/profile-settings");
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin + "/connect-unlock?rideId=" + rideId;
    const text = "I posted a ride: " + fromCity + " → " + toCity + " on " + dateLabel + " at " + timeLabel + ". Join me!";
    try {
      if (navigator.share) {
        await navigator.share({ title: "TravelMate Ride", text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Ride link copied to clipboard:\n" + shareUrl);
      }
    } catch { /* user cancelled */ }
  };

  const handlePostReturn = () => {
    // Pre-fill the post page with swapped from/to
    if (ride) {
      try {
        localStorage.setItem("returnRidePrefill", JSON.stringify({
          from: ride.to, to: ride.from,
          fromCoords: ride.toLat && ride.toLon ? { lat: ride.toLat, lon: ride.toLon } : null,
          toCoords: ride.fromLat && ride.fromLon ? { lat: ride.fromLat, lon: ride.fromLon } : null,
        }));
      } catch {}
    }
    navigate("/post-ride");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#eef0f4",
      display: "flex", flexDirection: "column",
      fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    }}>
      <Header />
      <div style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "32px 16px",
      }}>
      <div className="ride-live-card" style={{
        width: "100%", maxWidth: 420, background: "#fff",
        borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
        padding: "40px 28px 32px", textAlign: "center",
      }}>
        {/* Loading */}
        {loading && (
          <Spinner label="Loading your ride…" sublabel="Just a moment" />
        )}

        {/* Error */}
        {!loading && error && (
          <>
            <div style={{
              width: 70, height: 70, borderRadius: "50%",
              background: "#fef2f2", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 16px",
            }}>
              <span style={{ fontSize: 30 }}>⚠️</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>
              {error}
            </h2>
            <button
              onClick={() => navigate("/find-ride")}
              style={{
                width: "100%", background: "#f5c518", color: "#111",
                border: "none", borderRadius: 10, padding: "14px",
                fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18,
              }}
            >
              Back to Dashboard
            </button>
          </>
        )}

        {/* Success */}
        {!loading && !error && ride && (
          <>
            {/* Checkmark circle */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg, #f5c518 0%, #e6a800 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px", boxShadow: "0 4px 16px rgba(245,197,24,0.35)",
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M8 18l7 7 13-13" stroke="#fff" strokeWidth="3.2"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111", margin: "0 0 8px" }}>
              Your Ride is Live 🚗
            </h2>
            <p style={{ fontSize: 14, color: "#777", margin: "0 0 24px", lineHeight: 1.6 }}>
              People can now discover and connect with your ride.
            </p>

            {/* Ride info card */}
            <div style={{
              background: "#f7f8fc", border: "1px solid #e8eaf0",
              borderRadius: 12, padding: "18px 20px", marginBottom: 22, textAlign: "left",
            }}>
              {/* Route */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                        stroke="#555" strokeWidth="1.7" fill="none" />
                  <circle cx="12" cy="9" r="2.5" stroke="#555" strokeWidth="1.5" fill="none" />
                </svg>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>
                  {fromCity} → {toCity}
                </span>
              </div>

              {/* Date & Time */}
              <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="#555" strokeWidth="1.7" />
                    <path d="M16 2v4M8 2v4M3 10h18" stroke="#555" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 13, color: "#444", fontWeight: 500 }}>{dateLabel}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#555" strokeWidth="1.7" />
                    <path d="M12 7v5l3 3" stroke="#555" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 13, color: "#444", fontWeight: 500 }}>{timeLabel}</span>
                </div>
              </div>

              {/* Seats */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="7" r="3" stroke="#555" strokeWidth="1.6" />
                  <circle cx="17" cy="7" r="2.5" stroke="#555" strokeWidth="1.4" />
                  <path d="M3 20c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="#555" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M17 14c1.66 0 3 1.34 3 3v1" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 13, color: "#444", fontWeight: 500 }}>
                  {seats} {seats === 1 ? "seat" : "seats"} available
                </span>
              </div>

              {/* Vehicle (optional) */}
              {ride.vehicleModel && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"
                          stroke="#555" strokeWidth="1.6" strokeLinecap="round" />
                    <rect x="7" y="14" width="10" height="6" rx="1" stroke="#555" strokeWidth="1.6"/>
                  </svg>
                  <span style={{ fontSize: 13, color: "#444", fontWeight: 500 }}>
                    {ride.vehicleModel}{ride.vehicleColor ? " · " + ride.vehicleColor : ""}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 4 }}>
                ✨ Your journey starts here 🚀
              </div>
              <div style={{
                fontSize: 12, color: "#888",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <span style={{ color: "#f5c518" }}>⚡</span>
                Most rides get responses within 15 mins
              </div>
            </div>

            <button
              onClick={handleViewRide}
              style={{
                width: "100%", background: "#f5c518", color: "#111",
                border: "none", borderRadius: 10, padding: "15px",
                fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 12,
              }}
            >
              View Ride
            </button>

            <button
              onClick={handleShare}
              style={{
                width: "100%", background: "#fff", color: "#111",
                border: "1.5px solid #ddd", borderRadius: 10, padding: "14px",
                fontWeight: 600, fontSize: 16, cursor: "pointer", marginBottom: 16,
              }}
            >
              Share Ride
            </button>

            <button
              onClick={handlePostReturn}
              style={{
                background: "none", border: "none", color: "#c4a020",
                fontWeight: 600, fontSize: 14, cursor: "pointer", padding: 0,
              }}
            >
              Post Return Ride
            </button>
          </>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
}
