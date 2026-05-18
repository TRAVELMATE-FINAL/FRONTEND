import axios from "axios";

// ======================
// AXIOS INSTANCE
// ======================
// Normalize the backend URL so a misconfigured env var (e.g. trailing slash
// or "/api" already appended on Vercel) doesn't produce a "/api/api/..." path
// that the backend will reject with a 404 "Route not found".
const RAW_APP_URL =
  import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";
const APP_URL = RAW_APP_URL.replace(/\/+$/, "").replace(/\/api$/, "");

const API = axios.create({
  baseURL: APP_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Log the resolved baseURL once so the deployed bundle is self-diagnosing.
// Open DevTools → Console after page load — this prints the actual backend
// URL the app will hit. If it shows anything other than
// "https://travelmate-backend-dzpq.onrender.com/api" → fix the Vercel env var.
if (typeof window !== "undefined") {
  console.info("[TravelMate] API baseURL:", API.defaults.baseURL);
}

// ======================
// REQUEST INTERCEPTOR (future-ready)
// ======================
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // for future JWT
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ======================
// RESPONSE INTERCEPTOR (clean errors)
// ======================
API.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API ERROR:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

// ======================
// AUTH APIs
// ======================

// 🔹 SEND OTP
export const sendOtp = async (phone) => {
  const res = await API.post("/auth/send-otp", { phone });
  return res.data;
};

// 🔹 VERIFY OTP
export const verifyOtp = async (phone, otp) => {
  const res = await API.post("/auth/verify-otp", { phone, otp });

  // 🔥 store phone after verify
  localStorage.setItem("phone", phone);

  return res.data;
};

// ======================
// PROFILE API (NEW)
// ======================

// 🔹 SAVE PROFILE
export const saveProfile = async (data) => {
  const phone = localStorage.getItem("phone");

  if (!phone) {
    throw new Error("Phone not found. Please verify OTP first.");
  }

  const res = await API.post("/auth/profile", {
    ...data,
    phone,
  });

  return res.data;
};

// 🔹 GET PROFILE  ✅ ADD THIS
export const getProfile = async () => {
  const phone = localStorage.getItem("phone");

  if (!phone) {
    throw new Error("Phone not found. Please login again.");
  }

  const res = await API.get(`/auth/profile?phone=${phone}`);

  return res.data;
};

// ======================
// PLAN / PAYMENT APIs
// ======================

// Static catalogue (lets the FE render before any backend call)
export const getPlans = async () => {
  const res = await API.get("/plans/");
  return res.data;
};

// Active subscription for the logged-in user
export const getMySubscription = async () => {
  const phone = localStorage.getItem("phone");
  if (!phone) throw new Error("Login required");
  const res = await API.get(`/plans/me?phone=${encodeURIComponent(phone)}`);
  return res.data;
};

// Quick gate used before publishing a ride
export const canPostRide = async () => {
  const phone = localStorage.getItem("phone");
  if (!phone) return { canPostRide: false, reason: "Login required" };
  const res = await API.get(`/plans/can-post?phone=${encodeURIComponent(phone)}`);
  return res.data;
};

// Validate a coupon and return cashback amount
export const applyCoupon = async ({ code, plan }) => {
  const res = await API.post("/plans/coupon/apply", { code, plan });
  return res.data;
};

// Create a Razorpay order (server-side) — returns orderId + key + amount
// `amount` is in paise (₹1 = 100 paise). When passed, the backend uses it
// directly so the Razorpay popup always matches what the user sees on screen.
export const createPlanOrder = async ({ plan, couponCode = "", method = "", amount }) => {
  const phone = localStorage.getItem("phone");
  if (!phone) throw new Error("Login required");
  const body = { phone, plan, couponCode, method };
  if (amount && Number(amount) > 0) body.amount = Number(amount);
  const res = await API.post("/plans/order", body);
  return res.data;
};

// Verify Razorpay payment and activate subscription
export const verifyPlanPayment = async (payload) => {
  const phone = localStorage.getItem("phone");
  if (!phone) throw new Error("Login required");
  const res = await API.post("/plans/verify", { ...payload, phone });
  return res.data;
};
