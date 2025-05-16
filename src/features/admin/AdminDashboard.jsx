// src/features/admin/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

import { auth } from "../../config/firebaseConfig";
import Layout from "../../components/Layout";
import Button from "../../components/Button";

import AdminNavBar from "./components/AdminNavBar";
import OrdersTable from "./components/OrdersTable";
import UsersTable from "./components/UsersTable";
import AdminStationeryForm from "./components/AdminStationeryForm";
import AdminStationeryTable from "./components/AdminStationeryTable";
import EditUserModal from "./components/EditUserModal";

import { getAllOrders, updateOrderStatus } from "../../api/orderApi";
import {
  getAllUsers,
  updateUserRole as apiUpdateUserRole,
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
  deleteUser as apiDeleteUser,
  updateProfile,
  verifyMobileManual,
} from "../../api/userApi";
import { getAllStationery } from "../../api/stationeryApi";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [stationery, setStationery] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return navigate("/login");
      setPending(false);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (pending) return;
    if (activeTab === "orders") fetchOrders();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "stationery") fetchStationery();
  }, [activeTab, pending]);

  const wrapAction = async (apiCall, successMsg, refetch) => {
    setLoading(true);
    try {
      const result = await apiCall();
      if (successMsg) toast.success(successMsg);
      refetch && refetch();
      return result;
    } catch {
      toast.error("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = () =>
    wrapAction(async () => {
      const { orders } = await getAllOrders();
      setOrders(orders);
    }, null);

  const fetchUsers = () =>
    wrapAction(async () => {
      const { users } = await getAllUsers();
      setUsers(users);
    }, null);

  const fetchStationery = () =>
    wrapAction(async () => {
      const { products } = await getAllStationery();
      setStationery(products);
    }, null);

  const handleStatusChange = (id, status) =>
    wrapAction(
      () => updateOrderStatus(id, status),
      "Status updated",
      fetchOrders,
    );

  const handleRoleChange = (userId, newRole) =>
    wrapAction(
      () => apiUpdateUserRole(userId, newRole),
      "Role updated",
      fetchUsers,
    );

  const handleBlockUser = (userId) =>
    wrapAction(() => apiBlockUser(userId), "User blocked", fetchUsers);

  const handleUnblockUser = (userId) =>
    wrapAction(() => apiUnblockUser(userId), "User unblocked", fetchUsers);

  const handleDeleteUser = (userId) =>
    wrapAction(() => apiDeleteUser(userId), "User deleted", fetchUsers);

  const handleVerifyMobile = (userId) =>
    wrapAction(() => verifyMobileManual(userId), "Mobile verified", fetchUsers);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleSwitchToUser = () => navigate("/userdashboard");

  if (pending) return <div className="text-center mt-10">Checking login…</div>;

  return (
    <Layout title="Admin Dashboard">
      <Toaster />

      {/* Top actions */}
      <div className="flex justify-end gap-2 mb-4">
        <Button onClick={handleSwitchToUser}>Back to User View</Button>
        <Button onClick={handleLogout} className="bg-red-500 hover:bg-red-600">
          Logout
        </Button>
      </div>

      {/* Navigation tabs */}
      <AdminNavBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Content */}
      <div className="p-6 bg-white rounded shadow mt-4 overflow-auto min-h-[70vh]">
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
            <AdminStationeryTable products={stationery} loading={loading} />
          </>
        )}
      </div>
    </Layout>
  );
}
