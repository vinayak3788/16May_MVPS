// src/backend/routes/stationeryRoutes.js
import express from "express";
import multer from "multer";
import pool from "../db.js";
import { uploadImageToS3 } from "../../config/s3StationeryUploader.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure stationery_products table exists (with new columns)
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stationery_products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      discount REAL DEFAULT 0,
      images JSONB DEFAULT '[]',
      quantity INTEGER NOT NULL DEFAULT 0,
      sku TEXT,
      variants JSONB DEFAULT '[]',
      createdat TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Admin: Add new product
router.post(
  "/admin/stationery/add",
  upload.array("images", 5),
  async (req, res) => {
    const { name, description, price, discount, sku, quantity } = req.body;
    if (!name || !price || !sku) {
      return res
        .status(400)
        .json({ error: "Name, Price, and SKU are required" });
    }
    try {
      await ensureTable();
      const uploadedUrls = [];
      for (const file of req.files || []) {
        const { s3Url } = await uploadImageToS3(file.buffer, file.originalname);
        uploadedUrls.push(s3Url);
      }
      await pool.query(
        `INSERT INTO stationery_products
           (name, description, price, discount, images, quantity, sku, variants)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          name,
          description || "",
          parseFloat(price),
          parseFloat(discount) || 0,
          JSON.stringify(uploadedUrls),
          parseInt(quantity, 10) || 0,
          sku,
          JSON.stringify([]),
        ],
      );
      res.json({ message: "Product added successfully" });
    } catch (err) {
      console.error("❌ Error adding product:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Admin: Update product core fields & images
router.put(
  "/admin/stationery/update/:id",
  upload.array("images", 5),
  async (req, res) => {
    const { id } = req.params;
    const { name, description, price, discount, existing } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "Name and Price are required" });
    }
    try {
      await ensureTable();
      const keep = Array.isArray(existing)
        ? existing
        : existing
          ? JSON.parse(existing)
          : [];
      const urls = [...keep];
      for (const file of req.files || []) {
        const { s3Url } = await uploadImageToS3(file.buffer, file.originalname);
        urls.push(s3Url);
      }
      await pool.query(
        `UPDATE stationery_products
           SET name=$1, description=$2, price=$3, discount=$4, images=$5
         WHERE id=$6`,
        [
          name,
          description || "",
          parseFloat(price),
          parseFloat(discount) || 0,
          JSON.stringify(urls),
          id,
        ],
      );
      res.json({ message: "Product updated successfully" });
    } catch (err) {
      console.error("❌ Error updating product:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Admin: Delete product
router.delete("/admin/stationery/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await ensureTable();
    await pool.query(`DELETE FROM stationery_products WHERE id = $1`, [id]);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Update SKU
router.put("/admin/stationery/product/:id/sku", async (req, res) => {
  const { id } = req.params;
  const { sku } = req.body;
  try {
    await pool.query(
      `UPDATE stationery_products
         SET sku = $1
       WHERE id = $2`,
      [sku, id],
    );
    res.json({ message: "SKU updated successfully" });
  } catch (err) {
    console.error("❌ Error updating SKU:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Update Quantity
router.put("/admin/stationery/product/:id/quantity", async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  try {
    await pool.query(
      `UPDATE stationery_products
         SET quantity = $1
       WHERE id = $2`,
      [quantity, id],
    );
    res.json({ message: "Quantity updated successfully" });
  } catch (err) {
    console.error("❌ Error updating quantity:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User: Get all products
router.get("/stationery/products", async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT
         id,
         name,
         description,
         price,
         discount,
         images,
         quantity,
         sku,
         variants,
         createdat AS "createdAt"
       FROM stationery_products
       ORDER BY createdat DESC`,
    );
    res.json({ products: rows });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ error: "Failed to fetch products." });
  }
});

export default router;
