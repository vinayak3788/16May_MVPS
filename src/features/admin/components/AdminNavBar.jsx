// src/features/admin/components/AdminNavBar.jsx
import React from "react";

export default function AdminNavBar({
  activeTab,
  setActiveTab,
  fetchOrders,
  fetchUsers,
}) {
  return (
    <nav className="bg-white shadow rounded mb-6 p-4 flex gap-4">
      <button
        className={`px-4 py-2 rounded ${
          activeTab === "orders"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
        onClick={() => {
          setActiveTab("orders");
          fetchOrders();
        }}
      >
        Manage Orders
      </button>

      <button
        className={`px-4 py-2 rounded ${
          activeTab === "users"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
        onClick={() => {
          setActiveTab("users");
          fetchUsers();
        }}
      >
        Manage Users
      </button>

      <button
        className={`px-4 py-2 rounded ${
          activeTab === "stationery"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
        onClick={() => setActiveTab("stationery")}
      >
        Manage Stationery
      </button>
    </nav>
  );
}
