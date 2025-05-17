// src/features/user/components/useAuthCheck.js
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

/**
 * Hook to validate that the current user's mobile number is verified.
 * Handles mobileVerified as numeric (0/1) or boolean.
 */
export function useAuthCheck() {
  const navigate = useNavigate();

  const validateMobile = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/login");
      return;
    }

    // Super-admin bypass
    if (user.email === "vinayak3788@gmail.com") {
      return;
    }

    try {
      const { data } = await axios.get(
        `/api/get-profile?email=${encodeURIComponent(user.email)}`,
      );
      const { mobileNumber, mobileVerified: rawVerified, role = "user" } = data;

      // Normalize mobileVerified: accept 1, '1', true
      const mobileVerified = [1, "1", true].includes(rawVerified);

      // Admins bypass
      if (role === "admin") return;

      // If missing or not verified
      if (!mobileNumber || !mobileVerified) {
        toast.error("Mobile number not verified.");
        navigate("/verify-mobile");
      }
    } catch (err) {
      console.error("❌ Error checking mobile verification", err);
      toast.error("Mobile verification failed. Please log in again.");
      navigate("/login");
    }
  };

  return { validateMobile };
}
