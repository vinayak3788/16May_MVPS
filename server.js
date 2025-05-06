// server.js
import express from "express";
import path from "path";
import apiRouter from "./src/backend/index.js"; // or whatever your main router is

const app = express();
app.use(express.json());

// 1️⃣ API routes
app.use("/api", apiRouter);

// 2️⃣ Serve static build
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));

// 3️⃣ SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// 4️⃣ Listen
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
