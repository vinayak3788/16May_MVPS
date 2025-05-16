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
  console.error("Unexpected PG idle client error", err);
  process.exit(-1);
});

// ——— User / Role APIs ———

// Ensure a user record exists; create with default role if not
export const ensureUserRole = async (email) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT role FROM users WHERE email = $1",
      [email],
    );
    if (rows.length === 0) {
      const role = email === "vinayak3788@gmail.com" ? "admin" : "user";
      await client.query(
        "INSERT INTO users(email, role, protected, blocked) VALUES($1,$2,$3,$4)",
        [email, role, true, false],
      );
      return role;
    }
    return rows[0].role;
  } finally {
    client.release();
  }
};

// Fetch a user’s role
export const getUserRole = async (email) => {
  const { rows } = await pool.query("SELECT role FROM users WHERE email = $1", [
    email,
  ]);
  return rows[0]?.role || "user";
};

// Change a user’s role (protect super-admin)
export const updateUserRole = async (email, role) => {
  if (email === "vinayak3788@gmail.com") {
    throw new Error("Cannot update role for protected admin.");
  }
  await pool.query("UPDATE users SET role = $1 WHERE email = $2", [
    role,
    email,
  ]);
};

// Block / unblock / delete users
export const blockUser = async (email) => {
  if (email === "vinayak3788@gmail.com") {
    throw new Error("Cannot block protected admin.");
  }
  await pool.query("UPDATE users SET blocked = true WHERE email = $1", [email]);
};
export const unblockUser = async (email) => {
  await pool.query("UPDATE users SET blocked = false WHERE email = $1", [
    email,
  ]);
};
export const deleteUser = async (email) => {
  if (email === "vinayak3788@gmail.com") {
    throw new Error("Cannot delete protected admin.");
  }
  await pool.query("DELETE FROM users WHERE email = $1", [email]);
};
export const isUserBlocked = async (email) => {
  const { rows } = await pool.query(
    "SELECT blocked FROM users WHERE email = $1",
    [email],
  );
  return rows[0]?.blocked === true;
};

// ——— Profile APIs ———

// Create or update a profile
export const createUserProfile = async ({
  email,
  firstName,
  lastName,
  mobileNumber,
}) => {
  await pool.query(
    `INSERT INTO profiles(email, firstName, lastName, mobileNumber)
       VALUES($1,$2,$3,$4)
     ON CONFLICT(email) DO UPDATE SET
       firstName     = EXCLUDED.firstName,
       lastName      = EXCLUDED.lastName,
       mobileNumber  = EXCLUDED.mobileNumber`,
    [email, firstName, lastName, mobileNumber],
  );
};

// Fetch a user’s profile + blocked flag
export const getProfile = async (email) => {
  const { rows } = await pool.query(
    `SELECT
       p.email,
       p.firstName,
       p.lastName,
       p.mobileNumber,
       u.blocked
     FROM profiles p
     JOIN users u ON p.email = u.email
     WHERE p.email = $1`,
    [email],
  );
  return rows[0] || null;
};

// ——— Order APIs ———

// Create a new order, generate an orderNumber
export const createOrder = async ({
  userEmail,
  fileNames,
  printType,
  sideOption,
  spiralBinding = 0,
  totalPages = 0,
  totalCost,
}) => {
  const client = await pool.connect();
  try {
    const insert = await client.query(
      `INSERT INTO orders
         (user_email, file_names, print_type, side_option, spiral_binding, total_pages, total_cost)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        userEmail,
        fileNames,
        printType,
        sideOption,
        spiralBinding,
        totalPages,
        totalCost,
      ],
    );
    const id = insert.rows[0].id;
    const orderNumber = `ORD${String(id).padStart(4, "0")}`;
    await client.query(`UPDATE orders SET order_number = $1 WHERE id = $2`, [
      orderNumber,
      id,
    ]);
    return { id, orderNumber };
  } finally {
    client.release();
  }
};

// Fetch all orders (optionally filter in your route)
export const getAllOrders = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM orders ORDER BY created_at DESC`,
  );
  return { orders: rows };
};

// Update an individual order’s status
export const updateOrderStatus = async (id, status) => {
  await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);
};

// Update an order’s fileNames & totalPages post-upload
export const updateOrderFiles = async (orderId, { fileNames, totalPages }) => {
  await pool.query(
    "UPDATE orders SET file_names = $1, total_pages = $2 WHERE id = $3",
    [fileNames, totalPages, orderId],
  );
};

export default pool;
