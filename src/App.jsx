import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signin from "./pages/Signin";
import OtpVerify from "./pages/OtpVerify";
import ProfileSetup from "./pages/ProfileSetup";
import FindRide from "./pages/FindRide";
import PostRide from "./pages/PostRide";     
import FindFriend from "./pages/Findfriend";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Signin />} />
        <Route path="/otp" element={<OtpVerify />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/find-ride" element={<FindRide />} />
        <Route path="/find-friend" element={<FindFriend />} />  {/* ✅ added */}
        <Route path="/post-ride" element={<PostRide />} />  
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}