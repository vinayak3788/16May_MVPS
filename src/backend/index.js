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

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
await initDB();

const app = express();

// 1️⃣ General middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2️⃣ Request logging
app.use((req, res, next) => {
  console.log(
    `→ ${req.method} ${req.path}`,
    "query:",
    req.query,
    "body:",
    req.body,
  );
  next();
});

// 3️⃣ Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // adjust these domains to match your Firebase setup
      "script-src 'self' https://www.gstatic.com https://apis.google.com 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://identitytoolkit.googleapis.com https://www.googleapis.com",
      "img-src 'self' data: https://mvps-print-orders-s3.s3.amazonaws.com",
    ].join("; "),
  );
  next();
});

// 4️⃣ API routes
app.use("/api", stationeryRoutes);
app.use("/api", userRoutes);
app.use("/api", otpRoutes);
app.use("/api", orderRoutes);

// 5️⃣ Serve uploads
app.use(
  "/uploads",
  express.static(path.resolve(__dirname, "../../data/uploads")),
);

// 6️⃣ Serve the front-end
const distPath = path.resolve(__dirname, "../../dist");
app.use(express.static(distPath));

// 7️⃣ Fallback to index.html for client-side routing
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// 8️⃣ Start server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
