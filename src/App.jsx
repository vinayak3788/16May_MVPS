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
import AdminDashboard from "./features/admin/AdminDashboard";
import UserDashboard from "./features/user/UserDashboard";
import VerifyMobile from "./components/Auth/VerifyMobile";
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
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) clearCart();
      setAuthReady(true);
    });
    return () => unsub();
  }, [clearCart]);

  if (!authReady) {
    return <div className="text-center mt-10">Loading...</div>;
  }
  return children;
}

function ProtectedUserRoute({ children }) {
  const [status, setStatus] = useState("checking"); // "checking", "ok", "blocked", "verify", "redirectLogin"
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) {
        setStatus("redirectLogin");
        return;
      }

      try {
        // Role check
        const r = await axios.get(`/api/get-role?email=${u.email}`);
        if (!["user", "admin"].includes(r.data.role)) {
          setStatus("redirectLogin");
          return;
        }

        // Block check
        try {
          const p = await axios.get(`/api/get-profile?email=${u.email}`);
          if (p.data.blocked) {
            toast.error("Your account has been blocked.");
            setStatus("blocked");
            return;
          }
        } catch (err) {
          if (err.response?.status === 403) {
            toast.error("Your account has been blocked.");
            setStatus("blocked");
            return;
          }
          throw err;
        }

        // Mobile verification check
        const profile = await axios.get(`/api/get-profile?email=${u.email}`);
        if (!profile.data.mobileVerified) {
          setStatus("verify");
          return;
        }

        setStatus("ok");
      } catch {
        setStatus("redirectLogin");
      }
    })();
  }, [loc.pathname]);

  if (status === "checking") {
    return <div className="text-center mt-10">Checking access...</div>;
  }
  if (status === "redirectLogin") {
    return <Navigate to="/login" />;
  }
  if (status === "blocked") {
    return <Navigate to="/login" />;
  }
  if (status === "verify") {
    return <Navigate to="/verify-mobile" replace />;
  }
  // ok
  return children;
}

function ProtectedAdminRoute({ children }) {
  const [ok, setOk] = useState(null);
  const loc = useLocation();

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) return setOk(false);

      try {
        // must be admin
        const r = await axios.get(`/api/get-role?email=${u.email}`);
        if (r.data.role !== "admin") {
          return setOk(false);
        }

        // Block check
        try {
          const p = await axios.get(`/api/get-profile?email=${u.email}`);
          if (p.data.blocked) {
            toast.error("Your account has been blocked.");
            return setOk(false);
          }
        } catch (err) {
          if (err.response?.status === 403) {
            toast.error("Your account has been blocked.");
            return setOk(false);
          }
          throw err;
        }

        setOk(true);
      } catch {
        setOk(false);
      }
    })();
  }, [loc.pathname]);

  if (ok === null) {
    return <div className="text-center mt-10">Checking access...</div>;
  }
  return ok ? children : <Navigate to="/userdashboard" />;
}

export default function App() {
  return (
    <CartProvider>
      <AuthListener>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
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
