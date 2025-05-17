// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

import { auth } from "../../config/firebaseConfig";
import Layout from "../../components/Layout.jsx";
import Button from "../../components/Button.jsx";

import Sidebar from "./components/Sidebar.jsx";
import OrdersTable from "./components/OrdersTable.jsx";
import UsersTable from "./components/UsersTable.jsx";
import AdminStationeryForm from "./components/AdminStationeryForm.jsx";
import AdminStationeryTable from "./components/AdminStationeryTable.jsx";
import EditUserModal from "./components/EditUserModal.jsx";

import { getAllOrders, updateOrderStatus } from "../../api/orderApi.js";
import {
  getAllUsers,
  updateUserRole,
  blockUser,
  unblockUser,
  deleteUser,
  updateProfile,
  verifyMobileManual,
} from "../../api/userApi.js";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/login");
      setPending(false);
      await fetchOrders();
    });
    return () => unsub();
  }, [navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { orders } = await getAllOrders();
      setOrders(orders);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { users } = await getAllUsers();
      setUsers(users);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    setLoading(true);
    try {
      await updateOrderStatus(id, status);
      toast.success("Status updated");
      await fetchOrders();
    } catch {
      toast.error("Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (email, newRole) => {
    setLoading(true);
    try {
      await updateUserRole(email, newRole);
      toast.success("Role updated");
      await fetchUsers();
    } catch {
      toast.error("Role update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (email) => {
    setLoading(true);
    try {
      await blockUser(email);
      toast.success("User blocked");
      await fetchUsers();
    } catch {
      toast.error("Block failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (email) => {
    setLoading(true);
    try {
      await unblockUser(email);
      toast.success("User unblocked");
      await fetchUsers();
    } catch {
      toast.error("Unblock failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (email) => {
    setLoading(true);
    try {
      await deleteUser(email);
      toast.success("User deleted");
      await fetchUsers();
    } catch {
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMobile = async (email) => {
    setLoading(true);
    try {
      await verifyMobileManual(email);
      toast.success("Mobile status toggled");
      await fetchUsers();
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleSwitchToUser = () => {
    navigate("/userdashboard");
  };

  if (pending) {
    return <div className="text-center mt-10">Checking login…</div>;
  }

  return (
    <Layout title="Admin Dashboard">
      <Toaster />

      {/* Top controls */}
      <div className="flex justify-end gap-2 mb-6">
        <Button variant="secondary" onClick={handleSwitchToUser}>
          Back to User View
        </Button>
        <Button variant="danger" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <div className="flex min-h-[70vh]">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fetchOrders={fetchOrders}
          fetchUsers={fetchUsers}
        />

        {/* Main content */}
        <div className="flex-1 p-6 bg-white rounded shadow overflow-auto">
          {activeTab === "orders" && (
            <>
              <h2 className="text-2xl font-bold mb-4">Manage Orders</h2>
              <OrdersTable
                orders={orders}
                loading={loading}
                handleStatusChange={handleStatusChange}
              />
            </>
          )}

          {activeTab === "users" && (
            <>
              <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
              <UsersTable
                users={users}
                loading={loading}
                handleRoleChange={handleRoleChange}
                handleBlockUser={handleBlockUser}
                handleUnblockUser={handleUnblockUser}
                handleDeleteUser={handleDeleteUser}
                handleVerifyMobile={handleVerifyMobile}
                setEditUser={setEditUser}
              />
              <EditUserModal
                editUser={editUser}
                setEditUser={setEditUser}
                handleEditUser={updateProfile}
                saving={saving}
              />
            </>
          )}

          {activeTab === "stationery" && (
            <>
              <h2 className="text-2xl font-bold mb-4">Manage Stationery</h2>
              <AdminStationeryForm />
              <AdminStationeryTable />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
