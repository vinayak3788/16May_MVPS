// src/components/Auth/Signup.jsx
import React, { useState } from "react";
import { auth, googleProvider } from "../../config/firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Layout from "../Layout";
import Button from "../Button";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length) {
        toast.error(
          methods.includes("google.com")
            ? "That email is already registered via Google. Please sign in with Google."
            : "That email is already in use. Try signing in instead.",
        );
        setLoading(false);
        return;
      }

      await createUserWithEmailAndPassword(auth, email, password);

      await axios.post("/api/create-user-profile", {
        email,
        firstName,
        lastName,
        mobileNumber: mobile,
      });

      toast.success(`Welcome, ${firstName}!`);
      navigate("/verify-mobile");
    } catch (err) {
      console.error("Signup error:", err, err.response?.data);
      toast.error(
        err.response?.data?.error
          ? `Signup failed: ${err.response.data.error}`
          : "Signup failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email;
      let existing = null;
      try {
        const resp = await axios.get(`/api/get-profile?email=${userEmail}`);
        existing = resp.data;
      } catch (e) {
        if (e.response?.status !== 404) throw e;
      }
      if (existing?.firstName) {
        await auth.signOut();
        toast.error("Already registered. Please log in.");
        navigate("/login");
        return;
      }

      await axios.post("/api/create-user-profile", {
        email: userEmail,
        firstName: "",
        lastName: "",
        mobileNumber: "",
      });

      toast.success("Account created! Please verify mobile.");
      navigate("/verify-mobile");
    } catch (err) {
      console.error("Google signup error:", err);
      toast.error("Google signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Sign Up for MVP Services">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First Name */}
        <div>
          <label className="block mb-1 font-medium">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block mb-1 font-medium">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Mobile */}
        <div>
          <label className="block mb-1 font-medium">Mobile Number</label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) =>
              setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            required
            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-purple-500"
            maxLength={10}
            pattern="\d{10}"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Password with show/hide */}
        <div className="relative">
          <label className="block mb-1 font-medium">Password</label>
          <input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 px-3 py-2 rounded-md pr-10 focus:ring-2 focus:ring-purple-500"
          />
          <span
            onClick={() => setShowPwd((s) => !s)}
            className="absolute right-3 top-9 cursor-pointer text-gray-500 select-none"
          >
            {showPwd ? "🙈" : "👁️"}
          </span>
        </div>

        {/* Submit */}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing up…" : "Sign Up"}
        </Button>
      </form>

      <div className="text-center font-semibold my-6">OR</div>

      {/* Google Signup */}
      <Button
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full !text-gray-800 flex items-center justify-center border border-gray-300 bg-white hover:bg-gray-100"
      >
        <img src="/google-logo.svg" alt="Google" className="w-5 h-5 mr-2" />
        Sign up with Google
      </Button>

      <p className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-purple-600 font-medium underline"
        >
          Log In
        </button>
      </p>
    </Layout>
  );
}
