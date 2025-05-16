// src/backend/index.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import stationeryRoutes from "./routes/stationeryRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { initDB } from "./setupDb.js";

// Resolve __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Initialize the database
await initDB();

const app = express();

// 🚀 Middleware setup
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// 📦 Mount API routes under /api
app.use("/api", stationeryRoutes);
app.use("/api", userRoutes);
app.use("/api", otpRoutes);
app.use("/api", orderRoutes);

// 📁 Static file serving
const uploadDir = path.resolve(__dirname, "../../data/uploads");
const distPath = path.resolve(__dirname, "../../dist");
app.use("/uploads", express.static(uploadDir)); // Serve uploads
app.use(express.static(distPath)); // Serve React build assets

// 🌐 SPA fallback: serve index.html for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// 🔈 Start server on configured PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
