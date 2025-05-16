// src/features/admin/components/AdminNavBar.jsx
import React from "react";

export default function AdminNavBar({ activeTab, setActiveTab }) {
  const tabs = [
    { key: "orders", label: "Manage Orders" },
    { key: "users", label: "Manage Users" },
    { key: "stationery", label: "Manage Stationery" },
  ];

  return (
    <nav className="bg-purple-600 text-white">
      <ul className="flex justify-center">
        {tabs.map(({ key, label }) => (
          <li key={key}>
            <button
              className={`px-4 py-2 m-1 rounded-t ${
                activeTab === key ? "bg-purple-800" : "hover:bg-purple-500"
              }`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
