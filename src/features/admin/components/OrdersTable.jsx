// src/features/admin/components/OrdersTable.jsx
import React from "react";
import FileLinks from "/src/components/FileLinks";

export default function OrdersTable({ orders, loading, handleStatusChange }) {
  if (loading) {
    return <div className="text-center p-4">Loading orders...</div>;
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return <div className="text-center">No orders found.</div>;
  }

  return (
    <div className="rounded-xl border border-gray-300 shadow">
      <table className="min-w-full text-sm text-gray-800 whitespace-nowrap">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="px-3 py-2 border">Order No</th>
            <th className="px-3 py-2 border">User Email</th>
            <th className="px-3 py-2 border">Files</th>
            <th className="px-3 py-2 border">Pages</th>
            <th className="px-3 py-2 border">Options</th>
            <th className="px-3 py-2 border">Total Price</th>
            <th className="px-3 py-2 border">Status</th>
            <th className="px-3 py-2 border">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order, idx) => (
            <tr
              key={order.id}
              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              <td className="px-3 py-1 border text-center font-semibold">
                {order.orderNumber}
              </td>
              <td className="px-3 py-1 border text-center">
                {order.userEmail}
              </td>
              <td className="px-3 py-1 border text-center">
                <FileLinks
                  files={
                    Array.isArray(order.attachedFiles)
                      ? order.attachedFiles
                      : []
                  }
                />
              </td>
              <td className="px-3 py-1 border text-center font-mono">
                {order.totalPages ?? "-"}
              </td>
              <td className="px-3 py-1 border text-center">
                {order.printType?.toUpperCase()} |{" "}
                {order.sideOption?.toUpperCase()}{" "}
                {order.spiralBinding ? "| Spiral" : ""}
              </td>
              <td className="px-3 py-1 border text-right font-medium">
                ₹{order.totalCost}
              </td>
              <td className="px-3 py-1 border text-center">
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm shadow-sm bg-white"
                >
                  <option value="new">🟡 New</option>
                  <option value="in process">🟠 In Process</option>
                  <option value="ready to deliver">🟢 Ready</option>
                </select>
              </td>
              <td className="px-3 py-1 border text-center">
                {new Date(order.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
