// src/components/Auth/VerifyMobile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../config/firebaseConfig";
import { sendOtp, verifyOtp } from "../../api/otpApi";
import { getProfile } from "../../api/userApi";
import axios from "axios";
import toast from "react-hot-toast";
import Layout from "../Layout";
import Button from "../Button";

export default function VerifyMobile() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already verified
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const { mobileVerified } = await getProfile(user.email);
        if (mobileVerified) {
          navigate("/userdashboard", { replace: true });
        }
      } catch (err) {
        console.error("Profile check failed:", err);
      }
    })();
  }, [navigate]);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const { sessionId } = await sendOtp(mobile);
      setSessionId(sessionId);
      toast.success("OTP sent successfully!");
    } catch {
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
        setLoading(false);
        return;
      }

      // mark verified via existing endpoint
      const user = auth.currentUser;
      await axios.post("/api/verify-mobile-manual", {
        email: user.email,
      });

      toast.success("Mobile verified successfully!");
      navigate("/userdashboard", { replace: true });
    } catch {
      toast.error("OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Verify Mobile Number">
      {!sessionId ? (
        <>
          <input
            type="text"
            placeholder="Enter Mobile Number"
            value={mobile}
            onChange={(e) =>
              setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            className="w-full border px-3 py-2 rounded mb-4 focus:ring-2 focus:ring-purple-500"
          />
          <Button onClick={handleSendOtp} disabled={loading} className="w-full">
            {loading ? "Sending OTP…" : "Send OTP"}
          </Button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="w-full border px-3 py-2 rounded mb-4 focus:ring-2 focus:ring-purple-500"
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
