// src/backend/routes/cartRoutes.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

// ——— Ensure carts table exists ———
const ensureCartTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// 🛒 Add item to cart
router.post("/cart/add", async (req, res) => {
  const { userEmail, type, itemId, details } = req.body;
  if (!userEmail || !type || !itemId) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    await ensureCartTable();
    await pool.query(
      `INSERT INTO carts (user_email, type, item_id, details)
       VALUES ($1, $2, $3, $4)`,
      [userEmail, type, itemId, details || {}],
    );
    res.json({ message: "Added to cart" });
  } catch (err) {
    console.error("❌ Failed to add to cart:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// 🧾 Fetch cart for user
router.get("/cart", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    await ensureCartTable();
    const { rows } = await pool.query(
      `SELECT id, user_email, type, item_id, details, created_at
         FROM carts WHERE user_email = $1 ORDER BY created_at DESC`,
      [email],
    );
    const items = rows.map((r) => ({
      id: r.id,
      userEmail: r.user_email,
      type: r.type,
      itemId: r.item_id,
      details: r.details,
      createdAt: r.created_at,
    }));
    res.json({ items });
  } catch (err) {
    console.error("❌ Failed to get cart:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// 🗑️ Remove item from cart
router.post("/cart/remove", async (req, res) => {
  const { id } = req.body;
  if (id == null) {
    return res.status(400).json({ error: "Cart item ID required" });
  }
  try {
    await ensureCartTable();
    await pool.query(`DELETE FROM carts WHERE id = $1`, [id]);
    res.json({ message: "Removed from cart" });
  } catch (err) {
    console.error("❌ Failed to remove item:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
