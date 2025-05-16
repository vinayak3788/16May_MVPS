// src/backend/db.js

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Initialize PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected PG error", err);
  process.exit(-1);
});

// ——— User / Role Management ———
export const ensureUserRole = async (email) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT role FROM users WHERE email = $1`,
      [email],
    );
    if (rows.length === 0) {
      const role = email === "vinayak3788@gmail.com" ? "admin" : "user";
      await client.query(
        `INSERT INTO users(email, role, protected, blocked) VALUES ($1, $2, $3, $4)`,
        [email, role, true, false],
      );
      return role;
    }
    return rows[0].role;
  } finally {
    client.release();
  }
};

export const getUserRole = async (email) => {
  const { rows } = await pool.query(`SELECT role FROM users WHERE email = $1`, [
    email,
  ]);
  return rows[0]?.role || "user";
};

export const updateUserRole = async (email, role) => {
  if (email === "vinayak3788@gmail.com")
    throw new Error("Cannot update role for protected admin.");
  await pool.query(`UPDATE users SET role = $1 WHERE email = $2`, [
    role,
    email,
  ]);
};

export const blockUser = async (email) => {
  if (email === "vinayak3788@gmail.com")
    throw new Error("Cannot block protected admin.");
  await pool.query(`UPDATE users SET blocked = true WHERE email = $1`, [email]);
};

export const unblockUser = async (email) => {
  await pool.query(`UPDATE users SET blocked = false WHERE email = $1`, [
    email,
  ]);
};

export const deleteUser = async (email) => {
  if (email === "vinayak3788@gmail.com")
    throw new Error("Cannot delete protected admin.");
  await pool.query(`DELETE FROM users WHERE email = $1`, [email]);
};

export const isUserBlocked = async (email) => {
  const { rows } = await pool.query(
    `SELECT blocked FROM users WHERE email = $1`,
    [email],
  );
  return rows[0]?.blocked === true;
};

// ——— Profile Management ———
export const upsertProfile = async ({
  email,
  firstName,
  lastName,
  mobileNumber,
  mobileVerified = false,
}) => {
  await pool.query(
    `INSERT INTO profiles(email, firstName, lastName, mobileNumber, mobileVerified)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       firstName = EXCLUDED.firstName,
       lastName = EXCLUDED.lastName,
       mobileNumber = EXCLUDED.mobileNumber,
       mobileVerified = EXCLUDED.mobileVerified`,
    [email, firstName, lastName, mobileNumber, mobileVerified],
  );
};

export const getProfile = async (email) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.blocked
       FROM profiles p
       JOIN users u ON p.email = u.email
      WHERE p.email = $1`,
    [email],
  );
  return rows[0] || null;
};

// Convenience wrapper to mirror old behavior
export const createUserProfile = async ({
  email,
  firstName,
  lastName,
  mobileNumber,
}) => {
  await ensureUserRole(email);
  return upsertProfile({ email, firstName, lastName, mobileNumber });
};

// ——— Orders & Stationery ———
export const createOrder = async ({
  userEmail,
  fileNames = "",
  printType,
  sideOption = "",
  spiralBinding = false,
  totalPages = 0,
  totalCost,
  createdAt,
}) => {
  const client = await pool.connect();
  try {
    const insertRes = await client.query(
      `INSERT INTO orders
         (userEmail, fileNames, printType, sideOption, spiralBinding, totalPages, totalCost, status, createdAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'new',$8)
       RETURNING id`,
      [
        userEmail,
        fileNames,
        printType,
        sideOption,
        spiralBinding,
        totalPages,
        totalCost,
        createdAt,
      ],
    );
    const id = insertRes.rows[0].id;
    const orderNumber = `ORD${id.toString().padStart(4, "0")}`;
    await client.query(`UPDATE orders SET orderNumber = $1 WHERE id = $2`, [
      orderNumber,
      id,
    ]);
    return { id, orderNumber };
  } finally {
    client.release();
  }
};

export const getAllOrders = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM orders ORDER BY createdAt DESC`,
  );
  return { orders: rows };
};

export const updateOrderStatus = async (id, status) => {
  await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, id]);
};

export const updateOrderFiles = async (orderId, { fileNames, totalPages }) => {
  await pool.query(
    `UPDATE orders SET fileNames = $1, totalPages = $2 WHERE id = $3`,
    [fileNames, totalPages, orderId],
  );
};

export default pool;
