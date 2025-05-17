// src/features/user/components/useAuthCheck.js
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../config/firebaseConfig";
import toast from "react-hot-toast";

/**
 * Hook to validate that the current user's mobile number is verified.
 * Redirects to login or verification page as needed, but only toasts on real errors.
 */
export function useAuthCheck() {
  const navigate = useNavigate();

  const validateMobile = async () => {
    const user = auth.currentUser;
    if (!user) {
      // Redirect silently if not logged in
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
      const { mobileNumber, mobileVerified, role = "user" } = data;

      // Admins bypass mobile verification
      if (role === "admin") {
        return;
      }

      // If not verified, prompt for manual verification
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
