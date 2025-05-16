// src/backend/db.js

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected PG error", err);
  process.exit(-1);
});

// Ensure user role exists, create if not
export const ensureUserRole = async (email) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT role FROM users WHERE email = $1`,
      [email]
    );
    if (rows.length === 0) {
      const role = email === "vinayak3788@gmail.com" ? "admin" : "user";
      await client.query(
        `INSERT INTO users(email, role, protected, blocked) VALUES ($1, $2, $3, $4)`,
        [email, role, true, false]
      );
      return role;
    }
    return rows[0].role;
  } finally {
    client.release();
  }
};

export const getUserRole = async (email) => {
  const { rows } = await pool.query(
    `SELECT role FROM users WHERE email = $1`,
    [email]
  );
  return rows[0]?.role || "user";
};

export const updateUserRole = async (email, role) => {
  if (email === "vinayak3788@gmail.com")
    throw new Error("Cannot update role for protected admin.");
  await pool.query(
    `UPDATE users SET role = $1 WHERE email = $2`,
    [role, email]
  );
};

export const blockUser = async (email) => {
  if (email === "vinayak3788@gmail.com")
    throw new Error("Cannot block protected admin.");
  await pool.query(
    `UPDATE users SET blocked = 1 WHERE email = $1`,
    [email]
  );
};

export const unblockUser = async (email) => {
  await pool.query(
    `UPDATE users SET blocked = 0 WHERE email = $1`,
    [email]
  );
};

export const deleteUser = async (email) => {
  if (email === "vinayak3788@gmail.com")
    throw new Error("Cannot delete protected admin.");
  await pool.query(
    `DELETE FROM users WHERE email = $1`,
    [email]
  );
};

export const isUserBlocked = async (email) => {
  const { rows } = await pool.query(
    `SELECT blocked FROM users WHERE email = $1`,
    [email]
  );
  return rows[0]?.blocked === 1;
};

// Profile operations
export const upsertProfile = async ({ email, firstName, lastName, mobileNumber, mobileVerified = false }) => {
  await pool.query(
    `INSERT INTO profiles(email, firstName, lastName, mobileNumber, mobileVerified)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(email) DO UPDATE SET
       firstName = EXCLUDED.firstName,
       lastName = EXCLUDED.lastName,
       mobileNumber = EXCLUDED.mobileNumber,
       mobileVerified = EXCLUDED.mobileVerified`,
    [email, firstName, lastName, mobileNumber, mobileVerified]
  );
};

export const getProfile = async (email) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.blocked
     FROM profiles p
     JOIN users u ON p.email = u.email
     WHERE p.email = $1`,
    [email]
  );
  return rows[0] || null;
};

// Create user profile after signup
export const createUserProfile = async ({ email, firstName, lastName, mobileNumber }) => {
  await ensureUserRole(email);
  await upsertProfile({ email, firstName, lastName, mobileNumber });
};

// Other order / stationery exports remain unchanged...

export default pool;


// src/backend/routes/userRoutes.js

import express from "express";
import {
  updateUserRole,
  getUserRole,
  blockUser,
  unblockUser as dbUnblockUser,
  deleteUser,
  ensureUserRole,
  createUserProfile,
  getProfile,
} from "../db.js";

const router = express.Router();

console.log("🛠️  userRoutes.js loaded — unblock route is in play");

// Role management
router.post("/update-role", async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: "Email and role are required." });
  try {
    if (email === "vinayak3788@gmail.com" && role !== "admin")
      return res.status(403).json({ error: "❌ Cannot change super admin role." });
    await updateUserRole(email, role);
    res.json({ message: `✅ Role updated to ${role}` });
  } catch (err) {
    console.error("❌ Failed to update role:", err);
    res.status(500).json({ error: "Could not update role." });
  }
});

router.get("/get-role", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    await ensureUserRole(email);
    const role = await getUserRole(email);
    res.json({ role });
  } catch (err) {
    console.error("❌ Failed to get user role:", err);
    res.status(500).json({ error: "Could not get user role" });
  }
});

// Fetch all users
router.get("/get-users", async (req, res) => {
  try {
    const users = await pool.query(
      `SELECT u.email,u.role,u.blocked,p.firstName,p.lastName,p.mobileNumber,p.mobileVerified
       FROM users u LEFT JOIN profiles p ON u.email = p.email ORDER BY u.email`
    );
    res.json({ users: users.rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// Block/unblock/delete
router.post("/block-user", async (req, res) => {/*...*/});
router.post("/unblock-user", async (req, res) => {/*...*/});
router.post("/delete-user", async (req, res) => {/*...*/});

// Profile endpoints
router.post("/update-profile", async (req, res) => {/*...*/});
router.get("/get-profile", async (req, res) => {/*...*/});
router.post("/verify-mobile-manual", async (req, res) => {/*...*/});
router.post("/create-user-profile", async (req, res) => {
  const { email, firstName, lastName, mobileNumber } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    await createUserProfile({ email, firstName, lastName, mobileNumber });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to create user profile:", err);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

export default router;
