import axios from "axios";

// ======================
// AXIOS INSTANCE
// ======================
const APP_URL =
  import.meta.env.VITE_APP_URL || "https://travelmate-backend-dzpq.onrender.com";

const API = axios.create({
  baseURL: APP_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

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
export const createPlanOrder = async ({ plan, couponCode = "" }) => {
  const phone = localStorage.getItem("phone");
  if (!phone) throw new Error("Login required");
  const res = await API.post("/plans/order", { phone, plan, couponCode });
  return res.data;
};

// Verify Razorpay payment and activate subscription
export const verifyPlanPayment = async (payload) => {
  const phone = localStorage.getItem("phone");
  if (!phone) throw new Error("Login required");
  const res = await API.post("/plans/verify", { ...payload, phone });
  return res.data;
};