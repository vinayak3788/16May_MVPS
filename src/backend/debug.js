// src/backend/debug.js
// Utility script to dump all orders at startup
import { getAllOrders } from "./db.js";

(async function debug() {
  try {
    const { orders } = await getAllOrders();
    console.log("🛠️ Debug — Fetched orders:", orders);
  } catch (err) {
    console.error("❌ Debug error:", err);
  }
})();
