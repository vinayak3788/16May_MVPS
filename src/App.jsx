// src/App.jsx

import React, { useState, useEffect, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { auth } from "./config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { CartProvider, useCart } from "./context/CartContext";

// ——— Lazy-loaded pages ———
const Signup = React.lazy(() => import("./components/Auth/Signup"));
const Login = React.lazy(() => import("./components/Auth/Login"));
const VerifyMobile = React.lazy(() => import("./components/Auth/VerifyMobile"));
const AdminDashboard = React.lazy(
  () => import("./features/admin/AdminDashboard"),
);
const UserDashboard = React.lazy(() => import("./features/user/UserDashboard"));
const Cart = React.lazy(() => import("./pages/Cart"));
const UserOrders = React.lazy(() => import("./pages/UserOrders"));

// ——— Clears cart on sign-out and waits for initial auth check ———
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

  if (!ready) return <div className="text-center mt-10">Loading…</div>;
  return children;
}

// ——— Protects user routes ———
function ProtectedUserRoute({ children }) {
  const [status, setStatus] = useState("checking"); // checking, ok, redirectLogin, blocked, verify
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) {
        setStatus("redirectLogin");
        return;
      }
      if (location.pathname === "/verify-mobile") {
        setStatus("ok");
        return;
      }
      try {
        const r = await axios.get(`/api/get-role?email=${u.email}`);
        if (!["user", "admin"].includes(r.data.role)) {
          setStatus("redirectLogin");
          return;
        }
        const p = await axios.get(`/api/get-profile?email=${u.email}`);
        if (p.data.blocked) {
          toast.error("Your account has been blocked.");
          setStatus("blocked");
          return;
        }
        if (!p.data.mobileVerified) {
          setStatus("verify");
          return;
        }
        setStatus("ok");
      } catch {
        setStatus("redirectLogin");
      }
    })();
  }, [location.pathname, navigate]);

  if (status === "checking")
    return <div className="text-center mt-10">Checking access…</div>;
  if (status === "redirectLogin" || status === "blocked")
    return <Navigate to="/login" replace />;
  if (status === "verify") return <Navigate to="/verify-mobile" replace />;
  return children;
}

// ——— Protects admin routes ———
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

  if (ok === null)
    return <div className="text-center mt-10">Checking access…</div>;
  return ok ? children : <Navigate to="/userdashboard" replace />;
}

// ——— Main App ———
export default function App() {
  return (
    <CartProvider>
      <AuthListener>
        <Toaster position="top-center" />

        {/* Only the active route is loaded upfront */}
        <Suspense fallback={<div className="text-center mt-10">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-mobile" element={<VerifyMobile />} />

            <Route
              path="/userdashboard"
              element={
                <ProtectedUserRoute>
                  <UserDashboard />
                </ProtectedUserRoute>
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
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
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
        </Suspense>
      </AuthListener>
    </CartProvider>
  );
}
