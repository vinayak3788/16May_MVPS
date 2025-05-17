// src/backend/routes/orderRoutes.js
import express from "express";
import multer from "multer";
import {
  createOrder,
  updateOrderFiles,
  getAllOrders,
  updateOrderStatus,
} from "../db.js";
import { uploadFileToS3, getSignedUrl } from "../../config/s3Uploader.js";
import { sendOrderConfirmation } from "../mailer.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ——— SUBMIT PRINT/FILE FLOW ———
router.post("/submit-order", upload.array("files"), async (req, res) => {
  try {
    const {
      user,
      printType,
      sideOption,
      spiralBinding,
      totalCost,
      createdAt,
      pageCounts,
    } = req.body;

    if (!user || !totalCost || !createdAt || !printType) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!req.files?.length) {
      return res.status(400).json({ error: "No files uploaded." });
    }

    const parsedPages = JSON.parse(pageCounts || "[]");
    const { id: orderId } = await createOrder({
      userEmail: user,
      fileNames: "",
      printType,
      sideOption,
      spiralBinding: spiralBinding === "true" ? 1 : 0,
      totalPages: 0,
      totalCost,
      createdAt,
    });
    const orderNumber = `ORD${orderId.toString().padStart(4, "0")}`;

    const uploaded = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const { cleanFileName } = await uploadFileToS3(
        file.buffer,
        file.originalname,
        orderNumber,
      );
      uploaded.push({ name: cleanFileName, pages: parsedPages[i] || 0 });
    }

    if (req.body.items) {
      const stationeryList = JSON.parse(req.body.items);
      stationeryList.forEach((i) =>
        uploaded.push({ name: `${i.name} × ${i.quantity || 1}`, pages: 0 }),
      );
    }

    await updateOrderFiles(orderId, {
      fileNames: uploaded.map((f) => f.name).join(", "),
      totalPages: uploaded.reduce((sum, f) => sum + f.pages, 0),
    });

    res.json({ orderNumber, totalCost });
  } catch (err) {
    console.error("❌ Error saving print order:", err.stack || err);
    res.status(500).json({ error: "Failed to store print order." });
  }
});

// ——— SUBMIT STATIONERY FLOW ———
router.post("/submit-stationery-order", async (req, res) => {
  try {
    const { user, items, totalCost, createdAt } = req.body;
    if (!user || !Array.isArray(items) || !items.length || !totalCost) {
      return res.status(400).json({ error: "Missing stationery order data." });
    }

    const fileNames = items
      .map((i) => `${i.name} × ${i.quantity || 1}`)
      .join(", ");
    const { id: orderId } = await createOrder({
      userEmail: user,
      fileNames,
      printType: "stationery",
      sideOption: "",
      spiralBinding: 0,
      totalPages: items.reduce((sum, i) => sum + (i.quantity || 1), 0),
      totalCost,
      createdAt,
    });
    const orderNumber = `ORD${orderId.toString().padStart(4, "0")}`;
    res.json({ orderNumber, totalCost });
  } catch (err) {
    console.error("❌ Failed to store stationery order:", err);
    res.status(500).json({ error: "Failed to store stationery order." });
  }
});

// ——— CONFIRM PAYMENT → EMAIL ———
router.post("/confirm-payment", async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ error: "Order number required." });
    }
    const { orders } = await getAllOrders();
    const order = orders.find((o) => o.ordernumber === orderNumber);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    let html = `<h2>🧾 Order Confirmation</h2>
      <p><strong>Order No:</strong> ${orderNumber}</p>
      <p><strong>Total:</strong> ₹${order.totalcost.toFixed(2)}</p>`;
    if (order.printtype !== "stationery") {
      html += `
        <p><strong>Print Type:</strong> ${order.printtype === "color" ? "Color" : "Black & White"}</p>
        <p><strong>Print Side:</strong> ${order.sideoption === "double" ? "Back to Back" : "Single Sided"}</p>
        <p><strong>Spiral Binding:</strong> ${order.spiralbinding ? "Yes" : "No"}</p>`;
    }

    const parts = order.filenames.split(", ").filter(Boolean);
    const pdfs = parts.filter((p) => !p.includes("×"));
    const stationery = parts.filter((p) => p.includes("×"));
    if (pdfs.length) {
      html += `<p><strong>Files:</strong></p><ul>${pdfs.map((n) => `<li>${n}</li>`).join("")}</ul>`;
    }
    if (stationery.length) {
      html += `<p><strong>Stationery Items:</strong></p><ul>${stationery.map((n) => `<li>${n}</li>`).join("")}</ul>`;
    }

    await sendOrderConfirmation(
      `${order.useremail}, mvpservices2310@gmail.com`,
      `📌 MVPS Order Confirmed - ${orderNumber}`,
      html,
    );

    res.json({ message: "Confirmation email sent." });
  } catch (err) {
    console.error("❌ Payment confirmation error:", err);
    res.status(500).json({ error: "Failed to confirm payment." });
  }
});

// ——— GET SIGNED URL ———
router.get("/get-signed-url", async (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).json({ error: "Filename required" });
  try {
    const url = await getSignedUrl(filename);
    res.json({ url });
  } catch (err) {
    console.error("Error generating signed URL:", err);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
});

// ——— FETCH ALL ORDERS (normalized) ———
router.get("/get-orders", async (req, res) => {
  const userEmail = req.query.email;
  try {
    let { orders } = await getAllOrders();
    if (userEmail) {
      orders = orders.filter((o) => o.useremail === userEmail);
    }

    const normalized = orders.map((o) => ({
      id: o.id,
      orderNumber: o.ordernumber,
      userEmail: o.useremail,
      fileNames: o.filenames,
      printType: o.printtype,
      sideOption: o.sideoption,
      spiralBinding: o.spiralbinding,
      totalPages: o.totalpages,
      totalCost: o.totalcost,
      status: o.status,
      createdAt: o.createdat,
      attachedFiles: o.filenames
        ? o.filenames.split(", ").map((n) => ({ name: n }))
        : [],
    }));

    res.json({ orders: normalized });
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

// ——— UPDATE ORDER STATUS ———
router.post("/update-order-status", async (req, res) => {
  const { orderId, newStatus } = req.body;
  if (!orderId || !newStatus) {
    return res.status(400).json({ error: "Order ID and new status required." });
  }
  try {
    await updateOrderStatus(orderId, newStatus);
    res.json({ message: "✅ Order status updated successfully." });
  } catch (err) {
    console.error("❌ Failed to update order status:", err);
    res.status(500).json({ error: "Failed to update order status." });
  }
});

export default router;
