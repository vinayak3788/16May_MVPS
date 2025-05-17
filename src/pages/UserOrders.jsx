// src/pages/UserOrders.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { format } from "date-fns";
import { auth } from "../config/firebaseConfig";

import Layout from "../components/Layout";
import Button from "../components/Button";

export default function UserOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const userEmail = auth.currentUser?.email;
        const res = await axios.get("/api/get-orders", {
          params: { email: userEmail },
        });
        setOrders(Array.isArray(res.data.orders) ? res.data.orders : []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        toast.error("Could not load your orders.");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <Layout title="My Orders">
      <Toaster />

      {/* Back button at top */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={() => navigate("/userdashboard")}
          className="underline"
        >
          ← Back to Dashboard
        </Button>
      </div>

      {loading ? (
        <p className="text-center mt-10">Loading your orders…</p>
      ) : orders.length === 0 ? (
        <div className="text-center mt-10 space-y-4">
          <p>You have no orders yet.</p>
        </div>
      ) : (
        <ul className="space-y-4 max-w-4xl mx-auto">
          {orders.map((o) => (
            <li
              key={o.orderNumber}
              className="bg-white shadow rounded p-4 space-y-2"
            >
              <p>
                <strong>Order No:</strong> {o.orderNumber}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {format(new Date(o.createdAt), "M/d/yyyy, h:mm:ss a")}
              </p>
              <p>
                <strong>Status:</strong> {o.status}
              </p>

              {o.printType !== "stationery" && (
                <>
                  <p>
                    <strong>Print Type:</strong>{" "}
                    {o.printType === "color" ? "Color" : "Black & White"}
                  </p>
                  <p>
                    <strong>Print Side:</strong>{" "}
                    {o.sideOption === "double"
                      ? "Back to Back"
                      : "Single Sided"}
                  </p>
                  <p>
                    <strong>Spiral Binding:</strong>{" "}
                    {o.spiralBinding ? "Yes" : "No"}
                  </p>
                </>
              )}

              {o.attachedFiles.length > 0 && (
                <div>
                  <strong>
                    {o.printType === "stationery" ? "Items:" : "Files:"}
                  </strong>
                  <ul className="list-disc list-inside ml-4">
                    {o.attachedFiles.map((f) => (
                      <li key={f.name}>{f.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p>
                <strong>Total Paid:</strong> ₹{Number(o.totalCost).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
