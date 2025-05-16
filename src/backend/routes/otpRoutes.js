// src/backend/routes/otpRoutes.js

import express from "express";
import axios from "axios";

const router = express.Router();
const TWOFACTOR_API_KEY = process.env.TWOFACTOR_API_KEY;

/**
 * Send OTP
 * Expects { mobileNumber: "1234567890" } in body
 */
router.post("/send-otp", async (req, res) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
    return res
      .status(400)
      .json({ error: "Valid 10-digit mobile number required" });
  }

  try {
    const response = await axios.get(
      `https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/SMS/+91${mobileNumber}/AUTOGEN`,
    );
    const { Status, Details, Message } = response.data;

    if (Status !== "Success") {
      console.warn("2Factor send-otp error:", response.data);
      return res.status(502).json({ error: Message || "OTP service error" });
    }

    // Details contains the session ID on success
    return res.json({ sessionId: Details });
  } catch (err) {
    console.error("❌ Failed to send OTP:", err.response?.data || err.message);
    return res.status(500).json({
      error: err.response?.data?.Message || "Failed to send OTP.",
    });
  }
});

/**
 * Verify OTP
 * Expects { sessionId: "...", otp: "123456" } in body
 */
router.post("/verify-otp", async (req, res) => {
  const { sessionId, otp } = req.body;
  if (!sessionId || !otp) {
    return res.status(400).json({ error: "Session ID and OTP are required" });
  }

  try {
    const response = await axios.get(
      `https://2factor.in/API/V1/${TWOFACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`,
    );
    const { Status, Details, Message } = response.data;

    if (Status !== "Success") {
      console.warn("2Factor verify-otp error:", response.data);
      return res.status(502).json({ error: Message || "OTP service error" });
    }

    // Details === "OTP Matched" on a correct OTP
    return res.json({ success: Details === "OTP Matched" });
  } catch (err) {
    console.error(
      "❌ Failed to verify OTP:",
      err.response?.data || err.message,
    );
    return res.status(500).json({
      error: err.response?.data?.Message || "Failed to verify OTP.",
    });
  }
});

export default router;
