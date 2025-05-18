// src/backend/routes/stationeryRoutes.js
import express from "express";
import multer from "multer";
import pool from "../db.js";
import { uploadImageToS3 } from "../../config/s3StationeryUploader.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure the table exists with our new columns
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

/**
 * Admin: Add new product (with variants)
 * Expects:
 *  - name, description, price, discount, sku, quantity
 *  - variants: JSON string of [{ color, sku }, ...]
 *  - variantImages[]: files in same order as variants array
 */
router.post(
  "/admin/stationery/add",
  upload.array("variantImages", 10),
  async (req, res) => {
    const { name, description, price, discount, sku, quantity, variants } =
      req.body;
    if (!name || !price || !sku) {
      return res.status(400).json({ error: "Name, Price & SKU are required" });
    }
    try {
      await ensureTable();

      // Parse variant metadata and upload each file
      const meta = JSON.parse(variants || "[]");
      const files = req.files || [];
      const variantObjs = [];

      for (let i = 0; i < meta.length; i++) {
        const { color, sku: vsku } = meta[i];
        const file = files[i];
        if (!file) {
          throw new Error(`Missing image file for variant #${i}`);
        }
        const { s3Url } = await uploadImageToS3(file.buffer, file.originalname);
        variantObjs.push({ color, sku: vsku, imageUrl: s3Url });
      }

      // Use all variant image URLs as main images fallback
      const images = variantObjs.map((v) => v.imageUrl);

      // Insert row
      await pool.query(
        `INSERT INTO stationery_products
          (name, description, price, discount, images, quantity, sku, variants)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          name,
          description || "",
          parseFloat(price),
          parseFloat(discount) || 0,
          JSON.stringify(images),
          parseInt(quantity, 10) || 0,
          sku,
          JSON.stringify(variantObjs),
        ],
      );

      return res.json({ message: "Product added successfully" });
    } catch (err) {
      console.error("❌ Error adding product:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * Admin: Update existing product (fields, images, sku, quantity)
 * Expects:
 *  - name, description, price, discount, sku, quantity
 *  - existing: JSON string of image URLs to keep
 *  - images[]: any new image files to append
 */
router.put(
  "/admin/stationery/update/:id",
  upload.array("images", 10),
  async (req, res) => {
    const { id } = req.params;
    const { name, description, price, discount, existing, sku, quantity } =
      req.body;
    if (!name || !price || !sku) {
      return res.status(400).json({ error: "Name, Price & SKU are required" });
    }
    try {
      await ensureTable();

      // Build new images array: kept URLs + newly uploaded ones
      const keep = existing ? JSON.parse(existing) : [];
      const urls = Array.isArray(keep) ? [...keep] : [];
      for (const file of req.files || []) {
        const { s3Url } = await uploadImageToS3(file.buffer, file.originalname);
        urls.push(s3Url);
      }

      // Update row
      await pool.query(
        `UPDATE stationery_products
           SET name        = $1,
               description = $2,
               price       = $3,
               discount    = $4,
               images      = $5,
               sku         = $6,
               quantity    = $7
         WHERE id = $8`,
        [
          name,
          description || "",
          parseFloat(price),
          parseFloat(discount) || 0,
          JSON.stringify(urls),
          sku,
          parseInt(quantity, 10) || 0,
          id,
        ],
      );

      return res.json({ message: "Product updated successfully" });
    } catch (err) {
      console.error("❌ Error updating product:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * Admin: Delete product
 */
router.delete("/admin/stationery/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await ensureTable();
    await pool.query(`DELETE FROM stationery_products WHERE id = $1`, [id]);
    return res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Admin: Update only SKU
 */
router.put("/admin/stationery/product/:id/sku", async (req, res) => {
  const { id } = req.params;
  const { sku } = req.body;
  try {
    await pool.query(`UPDATE stationery_products SET sku = $1 WHERE id = $2`, [
      sku,
      id,
    ]);
    return res.json({ message: "SKU updated successfully" });
  } catch (err) {
    console.error("❌ Error updating SKU:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Admin: Update only quantity
 */
router.put("/admin/stationery/product/:id/quantity", async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  try {
    await pool.query(
      `UPDATE stationery_products SET quantity = $1 WHERE id = $2`,
      [parseInt(quantity, 10), id],
    );
    return res.json({ message: "Quantity updated successfully" });
  } catch (err) {
    console.error("❌ Error updating quantity:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Public: Fetch all products
 */
router.get("/stationery/products", async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await pool.query(
      `SELECT
         id, name, description, price, discount,
         images, quantity, sku, variants,
         createdat AS "createdAt"
       FROM stationery_products
       ORDER BY createdat DESC`,
    );
    return res.json({ products: rows });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    return res.status(500).json({ error: "Failed to fetch products." });
  }
});

export default router;
