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

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Initialize the database
await initDB();

const app = express();

// ① — Logging
app.use((req, res, next) => {
  console.log(
    `→ ${req.method} ${req.path} query:`,
    req.query,
    "body:",
    req.body,
  );
  next();
});

// ② — General middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ③ — Mount your API routers
app.use("/api", stationeryRoutes);
app.use("/api", userRoutes);
app.use("/api", otpRoutes);
app.use("/api", orderRoutes);

// ④ — Catch‐all for any unmatched /api/* — return JSON 404
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// ⑤ — Serve uploads directly
const uploadDir = path.resolve(__dirname, "../../data/uploads");
app.use("/uploads", express.static(uploadDir));

// ⑥ — Serve your front-end build
const distPath = path.resolve(__dirname, "../../dist");
app.use(express.static(distPath));

// ⑦ — SPA fallback for everything else
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ⑧ — Start listening
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
