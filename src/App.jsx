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
    // subscribe exactly once
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) clearCart();
      setReady(true);
    });
    return unsubscribe;
  }, []); // ← removed clearCart from deps

  if (!ready) return <div className="text-center mt-10">Loading…</div>;
  return children;
}

// ——— Protects user routes ———
function ProtectedUserRoute({ children }) {
  const [status, setStatus] = useState("checking");
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
  const Loading = <div className="text-center mt-10">Loading…</div>;

  return (
    <CartProvider>
      <AuthListener>
        <Toaster position="top-center" />

        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/login"
            element={
              <Suspense fallback={Loading}>
                <Login />
              </Suspense>
            }
          />

          <Route
            path="/signup"
            element={
              <Suspense fallback={Loading}>
                <Signup />
              </Suspense>
            }
          />

          <Route
            path="/verify-mobile"
            element={
              <Suspense fallback={Loading}>
                <VerifyMobile />
              </Suspense>
            }
          />

          <Route
            path="/userdashboard"
            element={
              <ProtectedUserRoute>
                <Suspense fallback={Loading}>
                  <UserDashboard />
                </Suspense>
              </ProtectedUserRoute>
            }
          />

          <Route
            path="/cart"
            element={
              <ProtectedUserRoute>
                <Suspense fallback={Loading}>
                  <Cart />
                </Suspense>
              </ProtectedUserRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedUserRoute>
                <Suspense fallback={Loading}>
                  <UserOrders />
                </Suspense>
              </ProtectedUserRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <Suspense fallback={Loading}>
                  <AdminDashboard />
                </Suspense>
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
      </AuthListener>
    </CartProvider>
  );
}
