// server.js
import express from "express";
import path from "path";
import apiRouter from "./src/backend/index.js"; // adjust path to your router entry point

const app = express();

// ── ➊ CSP middleware ───────────────────────────────────
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    // allow your app + Firebase Auth calls
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com; " +
      "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; " +
      "frame-src 'self' https://apis.google.com https://accounts.google.com https://*.firebaseapp.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:;",
  );
  next();
});

// ── ➋ JSON + API routes ────────────────────────────────
app.use(express.json());
app.use("/api", apiRouter);

// ── ➌ Serve static build ─────────────────────────────
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// ── ➍ SPA fallback ────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ── ➎ Listen ──────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
