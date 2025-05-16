// src/backend/routes/userRoutes.js
import express from "express";
import pool, {
  updateUserRole,
  getUserRole,
  blockUser,
  unblockUser,
  deleteUser,
  ensureUserRole,
  isUserBlocked,
  upsertProfile,
  getProfile,
} from "../db.js";

const router = express.Router();

console.log("🛠️  userRoutes.js loaded — unblock route is in play");

// ——— Change role (admin only) ———
router.post("/update-role", async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: "Email and role are required." });
  }
  try {
    if (email === "vinayak3788@gmail.com" && role !== "admin") {
      return res
        .status(403)
        .json({ error: "❌ Cannot change super admin role." });
    }
    await updateUserRole(email, role);
    res.json({ message: `✅ Role updated to ${role}` });
  } catch (err) {
    console.error("❌ Failed to update role:", err);
    res.status(500).json({ error: "Could not update role." });
  }
});

// ——— Get user role ———
router.get("/get-role", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    await ensureUserRole(email);
    const blocked = await isUserBlocked(email);
    if (blocked) {
      return res.status(403).json({ error: "User is blocked" });
    }
    const role = await getUserRole(email);
    res.json({ role });
  } catch (err) {
    console.error("❌ Failed to get user role:", err);
    res.status(500).json({ error: "Could not get user role" });
  }
});

// ——— List all users ———
router.get("/get-users", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         u.email,
         u.role,
         u.blocked,
         p.mobile           AS "mobileNumber",
         p.first_name       AS "firstName",
         p.last_name        AS "lastName",
         p.mobile_verified  AS "mobileVerified"
       FROM users u
       LEFT JOIN profiles p ON u.email = p.email
       ORDER BY u.email`,
    );
    res.json({ users: rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// ——— Block user ———
router.post("/block-user", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    await blockUser(email);
    res.json({ message: "✅ User blocked successfully." });
  } catch (err) {
    console.error("❌ Failed to block user:", err);
    res.status(500).json({ error: "Failed to block user." });
  }
});

// ——— Unblock user ———
router.post("/unblock-user", async (req, res) => {
  const { email } = req.body;
  console.log("🛠️  unblock-user handler hit for", email);
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }
  try {
    const { rows } = await pool.query(
      `SELECT email FROM users WHERE email = $1`,
      [email],
    );
    if (rows.length === 0) {
      console.warn(`→ unblock-user: no such user ${email}`);
      return res.json({
        message: "✅ User was not blocked (no record found).",
      });
    }
    await unblockUser(email);
    console.log(`→ Successfully unblocked ${email}`);
    return res.json({ message: "✅ User unblocked successfully." });
  } catch (err) {
    console.error("❌ Error inside unblock-user:", err);
    return res.json({ error: "Failed to unblock user." });
  }
});

// ——— Delete user ———
router.post("/delete-user", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    await deleteUser(email);
    res.json({ message: "✅ User deleted successfully." });
  } catch (err) {
    console.error("❌ Failed to delete user:", err);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// ——— Update user profile ———
router.post("/update-profile", async (req, res) => {
  const { email, mobileNumber, firstName, lastName, mobileVerified } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    await upsertProfile({
      email,
      firstName,
      lastName,
      mobileNumber,
      mobileVerified: mobileVerified ? 1 : 0,
    });
    res.json({ message: "✅ Profile updated successfully!" });
  } catch (err) {
    console.error("❌ Failed to update profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ——— Fetch profile details ———
router.get("/get-profile", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    const profile = await getProfile(email);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(profile);
  } catch (err) {
    console.error("❌ Failed to fetch profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ——— Verify mobile manually ———
router.post("/verify-mobile-manual", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    const profile = await getProfile(email);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    await upsertProfile({
      ...profile,
      mobileVerified: profile.mobileVerified ? 0 : 1,
    });
    res.json({ message: "✅ Mobile verification status updated!" });
  } catch (err) {
    console.error("❌ Failed to toggle mobile verification:", err);
    res.status(500).json({ error: "Failed to toggle mobile verification." });
  }
});

// ——— Create new user profile ———
router.post("/create-user-profile", async (req, res) => {
  const { email, firstName, lastName, mobileNumber } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    await ensureUserRole(email);
    await upsertProfile({
      email,
      firstName,
      lastName,
      mobileNumber,
      mobileVerified: 0,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to create user profile:", err);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

export default router;
