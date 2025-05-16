// src/backend/db.js

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

// Crash on unexpected errors
pool.on("error", (err) => {
  console.error("Unexpected PG error", err);
  process.exit(-1);
});

// ——— User / Role APIs ———

// Ensure a user record exists, create with default role if not
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
  await pool.query(`UPDATE users SET blocked = 1 WHERE email = $1`, [email]);
};

export const unblockUser = async (email) => {
  await pool.query(`UPDATE users SET blocked = 0 WHERE email = $1`, [email]);
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
  return rows[0]?.blocked === 1;
};

// ——— Profile APIs ———

/**
 * Insert or update a profile record.
 * profile = { email, firstName, lastName, mobileNumber, mobileVerified }
 */
export const upsertProfile = async (profile) => {
  const {
    email,
    firstName,
    lastName,
    mobileNumber,
    mobileVerified = false,
  } = profile;
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
    `SELECT p.email, p.firstName, p.lastName, p.mobileNumber, p.mobileVerified, u.blocked
       FROM profiles p
       JOIN users u ON p.email = u.email
      WHERE p.email = $1`,
    [email],
  );
  return rows[0] || null;
};

// ——— Order APIs ———

export const createOrder = async (order) => {
  const {
    userEmail,
    fileNames = "",
    printType,
    sideOption,
    spiralBinding = 0,
    totalPages = 0,
    totalCost,
    createdAt,
  } = order;

  // 1) insert order, get its id
  const insert = await pool.query(
    `INSERT INTO orders(userEmail, fileNames, printType, sideOption, spiralBinding, totalPages, totalCost, createdAt)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
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
  const id = insert.rows[0].id;
  const orderNumber = `ORD${id.toString().padStart(4, "0")}`;

  // 2) update the orderNumber
  await pool.query(`UPDATE orders SET orderNumber = $1 WHERE id = $2`, [
    orderNumber,
    id,
  ]);

  return { id, orderNumber };
};

export const getAllOrders = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM orders ORDER BY createdAt DESC`,
  );
  return { orders: rows };
};

export const updateOrderStatus = async (orderId, status) => {
  await pool.query(`UPDATE orders SET status = $1 WHERE id = $2`, [
    status,
    orderId,
  ]);
};

export const updateOrderFiles = async (orderId, { fileNames, totalPages }) => {
  await pool.query(
    `UPDATE orders SET fileNames = $1, totalPages = $2 WHERE id = $3`,
    [fileNames, totalPages, orderId],
  );
};

// ——— Stationery Products (optional) ———
// Add similar CRUD functions here if needed.

export default pool;
