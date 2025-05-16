// src/backend/routes/stationeryRoutes.js

import express from "express";
import multer from "multer";
import pool from "../db.js";
import { uploadImageToS3 } from "../../config/s3StationeryUploader.js";

const router = express.Router();

// Multer setup (memory storage for S3 upload)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ensure stationery_products table exists
const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stationery_products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      discount REAL DEFAULT 0,
      images JSONB DEFAULT '[]',
      createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Admin: Add new product
router.post(
  "/admin/stationery/add",
  upload.array("images", 5),
  async (req, res) => {
    const { name, description, price, discount } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "Name and Price are required" });
    }
    try {
      await ensureTable();

      const uploadedUrls = [];
      for (const file of req.files || []) {
        const { s3Url } = await uploadImageToS3(file.buffer, file.originalname);
        uploadedUrls.push(s3Url);
      }

      const imagesJson = JSON.stringify(uploadedUrls);

      await pool.query(
        `INSERT INTO stationery_products
           (name, description, price, discount, images)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          name,
          description || "",
          parseFloat(price),
          parseFloat(discount) || 0,
          imagesJson,
        ],
      );

      res.json({ message: "Product added successfully" });
    } catch (err) {
      console.error("❌ Error adding product:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Admin: Update product (with support for keeping old + uploading new images)
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
      const uploadedUrls = [...keep];

      for (const file of req.files || []) {
        const { s3Url } = await uploadImageToS3(file.buffer, file.originalname);
        uploadedUrls.push(s3Url);
      }

      const imagesJson = JSON.stringify(uploadedUrls);

      await pool.query(
        `UPDATE stationery_products
           SET name = $1,
               description = $2,
               price = $3,
               discount = $4,
               images = $5
         WHERE id = $6`,
        [
          name,
          description || "",
          parseFloat(price),
          parseFloat(discount) || 0,
          imagesJson,
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

// User: Get all products
router.get("/stationery/products", async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT id, name, description, price, discount, images, createdAt
         FROM stationery_products
        ORDER BY createdAt DESC`,
    );
    // rows.images is already JSONB
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
