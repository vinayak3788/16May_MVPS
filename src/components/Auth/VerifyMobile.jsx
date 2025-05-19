// src/components/Auth/VerifyMobile.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../config/firebaseConfig";
import { sendOtp, verifyOtp } from "../../api/otpApi";
import { getProfile } from "../../api/userApi";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

import Layout from "../Layout";
import Button from "../Button";

export default function VerifyMobile() {
  const location = useLocation();
  const navigate = useNavigate();

  // Grab the mobile passed in from signup or previous page
  const initialMobile = location.state?.mobile || "";
  const [mobile, setMobile] = useState(initialMobile);
  const [sessionId, setSessionId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // On mount, check if the user is already verified
  useEffect(() => {
    const checkVerified = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }
      try {
        const profile = await getProfile(user.email);
        if (profile.mobileVerified) {
          // already verified, skip OTP
          navigate("/userdashboard");
          return;
        }
        // if we have an initial mobile, immediately send OTP
        if (initialMobile) {
          handleSendOtp(initialMobile);
        }
      } catch (err) {
        console.error("Error checking profile:", err);
      }
    };
    checkVerified();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendOtp = async (overrideMobile) => {
    const num = overrideMobile || mobile;
    if (!/^\d{10}$/.test(num)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const { sessionId } = await sendOtp(num);
      setSessionId(sessionId);
      setMobile(num);
      toast.success("OTP sent successfully!");
    } catch (err) {
      console.error("Error sending OTP:", err);
      toast.error("Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(sessionId, otp);
      if (!result.success) {
        toast.error("Incorrect OTP. Try again.");
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        toast.error("User not found. Please log in again.");
        navigate("/login");
        return;
      }

      await axios.post("/api/update-profile", {
        email: user.email,
        firstName: "", // you can omit or fetch existing
        lastName: "",
        mobileNumber: mobile,
        mobileVerified: true,
      });

      toast.success("Mobile verified successfully!");
      navigate("/userdashboard");
    } catch (err) {
      console.error("Error verifying OTP:", err);
      toast.error("OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Verify Mobile Number">
      <Toaster />

      {/* Ask for mobile only if we haven’t sent OTP yet and no initialMobile */}
      {!sessionId && !initialMobile && (
        <>
          <input
            type="text"
            placeholder="Enter Mobile Number"
            value={mobile}
            onChange={(e) =>
              setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-purple-500 mb-4"
          />
          <Button
            onClick={() => handleSendOtp()}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Sending OTP…" : "Send OTP"}
          </Button>
        </>
      )}

      {/* OTP entry */}
      {sessionId && (
        <>
          <p className="mb-2">
            OTP sent to <strong>{mobile}</strong>
          </p>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-purple-500 mb-4"
          />
          <Button
            onClick={handleVerifyOtp}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? "Verifying…" : "Verify & Continue"}
          </Button>
        </>
      )}
    </Layout>
  );
}
