import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signin from "./pages/Signin";
import OtpVerify from "./pages/OtpVerify";
import ProfileSetup from "./pages/ProfileSetup";
import FindRide from "./pages/FindRide";
import PostPage from "./pages/PostPage";
import FindFriend from "./pages/Findfriend";
import ConnectUnlock from "./pages/ConnectUnlock";
import PlanPage from "./pages/PlanPage";
import Findrideplan from "./pages/Findrideplan";
import Chooseyourplan from "./pages/Chooseyourplan";
import SecurePayment from "./pages/SecurePayment";
import RideLive from "./pages/RideLive";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<FindRide />} />

        {/* Auth */}
        <Route path="/login" element={<Signin />} />
        <Route path="/otp" element={<OtpVerify />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />

        {/* App pages */}
        <Route path="/find-ride" element={<FindRide />} />
        <Route path="/find-friend" element={<FindFriend />} />
        <Route path="/post-ride" element={<PostPage />} />
        <Route path="/connect-unlock" element={<ConnectUnlock />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/findrideplan" element={<Findrideplan />} />
        <Route path="/chooseyourplan" element={<Chooseyourplan />} />
        <Route path="/securepayment" element={<SecurePayment />} />
        <Route path="/ride-live" element={<RideLive />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
