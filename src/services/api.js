import axios from "axios";

// ======================
// AXIOS INSTANCE
// ======================
const API = axios.create({
  baseURL: import.meta.env.VITE_APP_URL + "/api",
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