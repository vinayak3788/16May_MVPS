// src/App.jsx

import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Signup from "./components/Auth/Signup";
import Login from "./components/Auth/Login";
import VerifyMobile from "./components/Auth/VerifyMobile";
import AdminDashboard from "./features/admin/AdminDashboard";
import UserDashboard from "./features/user/UserDashboard";
import Cart from "./pages/Cart";
import UserOrders from "./pages/UserOrders";
import { auth } from "./config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { CartProvider, useCart } from "./context/CartContext";

// Clears cart on sign-out and waits for initial auth check
function AuthListener({ children }) {
  const { clearCart } = useCart();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) clearCart();
      setReady(true);
    });
    return () => unsub();
  }, [clearCart]);

  if (!ready) return <div className="text-center mt-10">Loading...</div>;
  return children;
}

// Protects user routes and redirects unverified users once
function ProtectedUserRoute({ children }) {
  const [status, setStatus] = useState("checking"); // checking, ok, redirectLogin, blocked, verify
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      // Not logged in
      if (!u) {
        setStatus("redirectLogin");
        return;
      }

      // If we’re already on the OTP page, skip the check here to avoid loop
      if (location.pathname === "/verify-mobile") {
        setStatus("ok");
        return;
      }

      try {
        // 1️⃣ Role check
        const r = await axios.get(`/api/get-role?email=${u.email}`);
        if (!["user", "admin"].includes(r.data.role)) {
          setStatus("redirectLogin");
          return;
        }

        // 2️⃣ Profile fetch
        const p = await axios.get(`/api/get-profile?email=${u.email}`);
        if (p.data.blocked) {
          toast.error("Your account has been blocked.");
          setStatus("blocked");
          return;
        }

        // 3️⃣ Mobile verification check
        if (!p.data.mobileVerified) {
          setStatus("verify");
          return;
        }

        // All good
        setStatus("ok");
      } catch {
        setStatus("redirectLogin");
      }
    })();
  }, [location.pathname, navigate]);

  if (status === "checking") {
    return <div className="text-center mt-10">Checking access...</div>;
  }
  if (status === "redirectLogin") return <Navigate to="/login" replace />;
  if (status === "blocked") return <Navigate to="/login" replace />;
  if (status === "verify") return <Navigate to="/verify-mobile" replace />;
  // status === ok
  return children;
}

// Protects admin routes
function ProtectedAdminRoute({ children }) {
  const [ok, setOk] = useState(null);
  const location = useLocation();

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) {
        setOk(false);
        return;
      }
      try {
        const r = await axios.get(`/api/get-role?email=${u.email}`);
        if (r.data.role !== "admin") {
          setOk(false);
          return;
        }
        const p = await axios.get(`/api/get-profile?email=${u.email}`);
        if (p.data.blocked) {
          toast.error("Your account has been blocked.");
          setOk(false);
          return;
        }
        setOk(true);
      } catch {
        setOk(false);
      }
    })();
  }, [location.pathname]);

  if (ok === null) {
    return <div className="text-center mt-10">Checking access...</div>;
  }
  return ok ? children : <Navigate to="/userdashboard" replace />;
}

export default function App() {
  return (
    <CartProvider>
      <AuthListener>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/verify-mobile" element={<VerifyMobile />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/userdashboard"
            element={
              <ProtectedUserRoute>
                <UserDashboard />
              </ProtectedUserRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />

          <Route
            path="/cart"
            element={
              <ProtectedUserRoute>
                <Cart />
              </ProtectedUserRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedUserRoute>
                <UserOrders />
              </ProtectedUserRoute>
            }
          />

          <Route
            path="*"
            element={
              <div className="text-center text-red-500 mt-10">
                404 - Page Not Found
              </div>
            }
          />
        </Routes>
      </AuthListener>
    </CartProvider>
  );
}
