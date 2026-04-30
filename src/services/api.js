import axios from "axios";

// ======================
// AXIOS INSTANCE
// ======================
const API = axios.create({
  baseURL: "http://localhost:5000/api",
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
export const saveProfile = async (data) => {
  const res = await API.post("/auth/profile", data);
  return res.data;
};