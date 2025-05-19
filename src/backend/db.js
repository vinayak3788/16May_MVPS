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
      // protected and blocked columns are INT (0/1), not BOOLEAN
      await client.query(
        `INSERT INTO users(email, role, protected, blocked) VALUES ($1, $2, $3, $4)`,
        [
          email,
          role,
          role === "admin" ? 1 : 0, // protected flag as INT
          0, // blocked = false → 0
        ],
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
  if (email === "vinayak3788@gmail.com") {
    throw new Error("Cannot update role for protected admin.");
  }
  await pool.query(`UPDATE users SET role = $1 WHERE email = $2`, [
    role,
    email,
  ]);
};

export const blockUser = async (email) => {
  if (email === "vinayak3788@gmail.com") {
    throw new Error("Cannot block protected admin.");
  }
  await pool.query(`UPDATE users SET blocked = TRUE WHERE email = $1`, [email]);
};

export const unblockUser = async (email) => {
  await pool.query(`UPDATE users SET blocked = FALSE WHERE email = $1`, [
    email,
  ]);
};

export const deleteUser = async (email) => {
  if (email === "vinayak3788@gmail.com") {
    throw new Error("Cannot delete protected admin.");
  }
  await pool.query(`DELETE FROM users WHERE email = $1`, [email]);
};

export const isUserBlocked = async (email) => {
  const { rows } = await pool.query(
    `SELECT blocked FROM users WHERE email = $1`,
    [email],
  );
  return rows[0]?.blocked === true;
};

// ——— Profile APIs ———

/**
 * Insert or update a profile record.
 * profile = { email, firstName, lastName, mobileNumber, mobileVerified }
 */
export const upsertProfile = async ({
  email,
  firstName,
  lastName,
  mobileNumber,
  mobileVerified = false,
}) => {
  // Validate and convert mobileNumber into a JS Number (or null) for BIGINT column
  const mobilenumber = /^\d{10}$/.test(mobileNumber)
    ? parseInt(mobileNumber, 10)
    : null;

  // Convert boolean mobileVerified into integer 0 or 1
  const mobileverified = mobileVerified ? 1 : 0;

  await pool.query(
    `INSERT INTO profiles(email, firstname, lastname, mobilenumber, mobileverified)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       firstname      = EXCLUDED.firstname,
       lastname       = EXCLUDED.lastname,
       mobilenumber   = EXCLUDED.mobilenumber,
       mobileverified = EXCLUDED.mobileverified`,
    [email, firstName, lastName, mobilenumber, mobileverified],
  );
};

export const getProfile = async (email) => {
  const { rows } = await pool.query(
    `
    SELECT
      p.email,
      p.firstname      AS "firstName",
      p.lastname       AS "lastName",
      p.mobilenumber   AS "mobileNumber",
      p.mobileverified AS "mobileVerified",
      u.blocked,
      u.role
    FROM profiles p
    JOIN users u ON p.email = u.email
    WHERE p.email = $1
    `,
    [email],
  );
  return rows[0] || null;
};

// ——— Order APIs ———

export const createOrder = async ({
  userEmail,
  fileNames = "",
  printType,
  sideOption,
  spiralBinding = false,
  totalPages = 0,
  totalCost,
  createdAt,
}) => {
  const insert = await pool.query(
    `INSERT INTO orders(
       userEmail, fileNames, printType,
       sideOption, spiralBinding, totalPages,
       totalCost, createdAt
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
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
  const orderNumber = `ORD${String(id).padStart(4, "0")}`;

  await pool.query(`UPDATE orders SET ordernumber = $1 WHERE id = $2`, [
    orderNumber,
    id,
  ]);

  return { id, orderNumber };
};

export const getAllOrders = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM orders ORDER BY createdat DESC`,
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

export default pool;
