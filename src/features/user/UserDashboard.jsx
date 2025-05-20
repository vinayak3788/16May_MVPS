// src/features/user/UserDashboard.jsx

import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";

import { auth } from "../../config/firebaseConfig";
import Layout from "../../components/Layout";
import Button from "../../components/Button";

import UploadOrderForm from "./components/UploadOrderForm";
import OrdersHistory from "./components/OrdersHistory";
import StationeryStore from "./components/StationeryStore";
import { useOrders } from "./components/useOrders";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(true);
  const { files, setFiles, myOrders, fetchMyOrders, ordersLoading } =
    useOrders();
  const [activeTab, setActiveTab] = useState("orders");

  // ——— fetch user’s orders once on mount ———
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        await fetchMyOrders(user.email);
      } finally {
        setPending(false);
      }
    })();
  }, [fetchMyOrders, navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  const handleViewCart = () => navigate("/cart");

  const handleAdminAccess = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("User not logged in.");
      return;
    }
    try {
      await user.getIdToken(true);
      const res = await axios.get(`/api/get-role?email=${user.email}`);
      if (res.data.role === "admin" || user.email === "vinayak3788@gmail.com") {
        navigate("/admin");
      } else {
        toast.error("Access denied. You are not an admin.");
      }
    } catch (err) {
      console.error("Admin access check failed", err);
      toast.error("Could not verify role. Try again.");
    }
  };

  if (pending) {
    return <div className="text-center mt-10">Checking login…</div>;
  }

  return (
    <Layout title="MVPS Dashboard">
      <Toaster />

      {/* Top controls */}
      <div className="flex flex-wrap justify-end gap-2 mb-6">
        <Button variant="secondary" onClick={handleViewCart}>
          View Cart
        </Button>
        <Button variant="primary" onClick={handleAdminAccess}>
          Switch to Admin
        </Button>
        <Button variant="danger" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      {/* Tab buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <Button
          variant={activeTab === "orders" ? "primary" : "secondary"}
          onClick={() => setActiveTab("orders")}
        >
          📄 Print Orders
        </Button>
        <Button
          variant={activeTab === "stationery" ? "primary" : "secondary"}
          onClick={() => setActiveTab("stationery")}
        >
          🛒 Stationery Orders
        </Button>
      </div>

      {/* Content */}
      {activeTab === "orders" ? (
        <>
          <UploadOrderForm
            files={files}
            setFiles={setFiles}
            fetchMyOrders={fetchMyOrders}
          />
          <OrdersHistory myOrders={myOrders} ordersLoading={ordersLoading} />
        </>
      ) : (
        <StationeryStore />
      )}
    </Layout>
  );
}
