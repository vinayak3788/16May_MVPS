// src/components/Auth/VerifyMobile.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../config/firebaseConfig";
import { sendOtp, verifyOtp } from "../../api/otpApi";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

import Layout from "../Layout";
import Button from "../Button";

export default function VerifyMobile() {
  const location = useLocation();
  const navigate = useNavigate();

  // Grab the mobile passed from signup (otherwise blank)
  const initialMobile = location.state?.mobile || "";
  const [mobile, setMobile] = useState(initialMobile);
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);

  // If we have an initial mobile, immediately send OTP on mount
  useEffect(() => {
    if (initialMobile) {
      handleSendOtp();
    }
  }, [initialMobile]);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const result = await sendOtp(mobile);
      setSessionId(result.sessionId);
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

      // Persist the verification flag—no need to re-enter mobile
      await axios.post("/api/update-profile", {
        email: user.email,
        firstName: "", // leave unchanged server-side
        lastName: "",
        mobileNumber: mobile, // from initial signup
        mobileVerified: true, // now verified
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

      {/* Only ask for mobile if none was passed in */}
      {!initialMobile && !sessionId && (
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
          <Button onClick={handleSendOtp} disabled={loading} className="w-full">
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
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {loading ? "Verifying…" : "Verify & Continue"}
          </Button>
        </>
      )}
    </Layout>
  );
}
