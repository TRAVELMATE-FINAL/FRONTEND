import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signin from "./pages/Signin";
import OtpVerify from "./pages/OtpVerify";
import ProfileSetup from "./pages/ProfileSetup";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signin />} />
        <Route path="/otp" element={<OtpVerify />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />

        {/* fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}