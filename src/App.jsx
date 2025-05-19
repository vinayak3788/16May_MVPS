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

function ProtectedUserRoute({ children }) {
  const [state, setState] = useState("checking"); // checking, ok, redirectLogin, verify, blocked
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) {
        setState("redirectLogin");
        return;
      }

      try {
        // role
        const r = await axios.get(`/api/get-role?email=${u.email}`);
        if (!["user", "admin"].includes(r.data.role)) {
          setState("redirectLogin");
          return;
        }
        // profile
        const p = await axios.get(`/api/get-profile?email=${u.email}`);
        if (p.data.blocked) {
          toast.error("Your account has been blocked.");
          setState("blocked");
          return;
        }
        if (!p.data.mobileVerified) {
          setState("verify");
          return;
        }
        setState("ok");
      } catch {
        setState("redirectLogin");
      }
    })();
  }, []); // run only once

  if (state === "checking")
    return <div className="text-center mt-10">Checking access...</div>;
  if (state === "redirectLogin") return <Navigate to="/login" />;
  if (state === "blocked") return <Navigate to="/login" />;
  if (state === "verify") return <Navigate to="/verify-mobile" replace />;
  return children; // ok
}

function ProtectedAdminRoute({ children }) {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) return setOk(false);
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
  }, []); // run only once

  if (ok === null)
    return <div className="text-center mt-10">Checking access...</div>;
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
