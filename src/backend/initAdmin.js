// src/server/initAdmin.js

import pool from "../backend/db.js";

async function initAdmin() {
  try {
    // ensure users table exists (adjust columns to match your schema)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        role TEXT DEFAULT 'user',
        protected BOOLEAN DEFAULT false,
        blocked BOOLEAN DEFAULT false
      )
    `);

    // upsert super-admin
    await pool.query(
      `
      INSERT INTO users (email, role, protected, blocked)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE
        SET role = EXCLUDED.role,
            protected = EXCLUDED.protected,
            blocked = EXCLUDED.blocked
      `,
      ["vinayak3788@gmail.com", "admin", true, false],
    );

    console.log("✅ Super-admin user inserted/updated.");
    process.exit(0);
  } catch (err) {
    console.error("❌ initAdmin failed:", err);
    process.exit(1);
  }
}

initAdmin();
