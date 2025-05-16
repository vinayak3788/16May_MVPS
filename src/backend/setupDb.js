// src/backend/setupDb.js

import pool from "./db.js"; // uses your PostgreSQL pool

export const initDB = async () => {
  // ─── Users ────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      role TEXT      NOT NULL DEFAULT 'user',
      protected BOOL NOT NULL DEFAULT FALSE,
      blocked   BOOL NOT NULL DEFAULT FALSE
    );
  `);

  // ─── Orders ───────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id           SERIAL PRIMARY KEY,
      userEmail    TEXT       REFERENCES users(email),
      fileNames    TEXT,
      printType    TEXT,
      sideOption   TEXT,
      spiralBinding BOOL      DEFAULT FALSE,
      totalPages   INT        DEFAULT 0,
      totalCost    NUMERIC,
      status       TEXT       DEFAULT 'new',
      createdAt    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      orderNumber  TEXT
    );
  `);

  // ─── Profiles ─────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      email          TEXT PRIMARY KEY REFERENCES users(email),
      firstName      TEXT,
      lastName       TEXT,
      mobileNumber   TEXT,
      mobileVerified BOOL DEFAULT FALSE
    );
  `);

  // ─── Stationery Products ──────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stationery_products (
      id          SERIAL PRIMARY KEY,
      name        TEXT       NOT NULL,
      description TEXT,
      price       NUMERIC    NOT NULL,
      discount    NUMERIC    DEFAULT 0,
      images      JSONB      DEFAULT '[]',
      createdAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("✅ All tables ensured in PostgreSQL");
};

initDB().catch((err) => {
  console.error("❌ initDB error:", err);
  process.exit(1);
});
