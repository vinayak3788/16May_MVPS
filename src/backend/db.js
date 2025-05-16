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

// crash on unexpected errors
pool.on("error", (err) => {
  console.error("Unexpected PG error", err);
  process.exit(-1);
});

// ——— User role APIs ———

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
  await pool.query(`UPDATE users SET blocked = TRUE WHERE email = $1`, [email]);
};

export const unblockUser = async (email) => {
  await pool.query(`UPDATE users SET blocked = FALSE WHERE email = $1`, [
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

// ——— Profile APIs ———

/**
 * Inserts or updates a profile record.
 */
export const upsertProfile = async ({
  email,
  firstName,
  lastName,
  mobileNumber,
  mobileVerified = false,
}) => {
  await pool.query(
    `INSERT INTO profiles(email, firstName, lastName, mobileNumber, mobileVerified)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE SET
         firstName      = EXCLUDED.firstName,
         lastName       = EXCLUDED.lastName,
         mobileNumber   = EXCLUDED.mobileNumber,
         mobileVerified = EXCLUDED.mobileVerified`,
    [email, firstName, lastName, mobileNumber, mobileVerified],
  );
};

/**
 * Returns profile + blocked flag, or null if missing.
 */
export const getProfile = async (email) => {
  const { rows } = await pool.query(
    `SELECT 
       p.email,
       p.firstName,
       p.lastName,
       p.mobileNumber,
       p.mobileVerified,
       u.blocked
     FROM profiles p
     JOIN users u ON p.email = u.email
     WHERE p.email = $1`,
    [email],
  );
  return rows[0] || null;
};

export default pool;
