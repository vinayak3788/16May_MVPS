// src/backend/routes/userRoutes.js
import express from "express";
import pool, {
  ensureUserRole,
  getUserRole,
  updateUserRole,
  blockUser,
  unblockUser,
  deleteUser,
  isUserBlocked,
  upsertProfile,
  getProfile,
} from "../db.js";

const router = express.Router();

// ——— Change someone’s role (super-admin protected) ———
router.post("/update-role", async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: "Email and role are required." });
  }
  try {
    if (email === "vinayak3788@gmail.com" && role !== "admin") {
      return res.status(403).json({ error: "Cannot change super admin role." });
    }
    await updateUserRole(email, role);
    res.json({ message: `Role updated to ${role}.` });
  } catch (err) {
    console.error("❌ Failed to update role:", err);
    res.status(500).json({ error: "Internal error updating role." });
  }
});

// ——— Fetch (and auto-create) a user’s role ———
router.get("/get-role", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required." });
  try {
    await ensureUserRole(email);
    if (await isUserBlocked(email)) {
      return res.status(403).json({ error: "User is blocked." });
    }
    const role = await getUserRole(email);
    res.json({ role });
  } catch (err) {
    console.error("❌ Failed to get user role:", err);
    res.status(500).json({ error: "Internal error fetching role." });
  }
});

// ——— List all users ———
router.get("/get-users", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        u.email, 
        u.role, 
        u.blocked, 
        p."mobileNumber", 
        p."firstName", 
        p."lastName", 
        p."mobileVerified"
      FROM users u
      LEFT JOIN profiles p ON u.email = p.email
      ORDER BY u.email
    `);
    res.json({ users: rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Internal error fetching users." });
  }
});

// ——— Block user ———
router.post("/block-user", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });
  try {
    await blockUser(email);
    res.json({ message: "User blocked successfully." });
  } catch (err) {
    console.error("❌ Error blocking user:", err);
    if (err.message.includes("protected")) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal error blocking user." });
  }
});

// ——— Unblock user ———
router.post("/unblock-user", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });
  try {
    await unblockUser(email);
    res.json({ message: "User unblocked successfully." });
  } catch (err) {
    console.error("❌ Error unblocking user:", err);
    res.status(500).json({ error: "Internal error unblocking user." });
  }
});

// ——— Delete user ———
router.post("/delete-user", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });
  try {
    await deleteUser(email);
    res.json({ message: "User deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ error: "Internal error deleting user." });
  }
});

// ——— Update user profile ———
router.post("/update-profile", async (req, res) => {
  const { email, firstName, lastName, mobileNumber, mobileVerified } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });
  try {
    await upsertProfile({
      email,
      firstName,
      lastName,
      mobileNumber,
      mobileVerified: mobileVerified ? 1 : 0,
    });
    res.json({ message: "Profile updated successfully." });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ error: "Internal error updating profile." });
  }
});

// ——— Fetch profile details ———
router.get("/get-profile", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email is required." });
  try {
    const profile = await getProfile(email);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }
    res.json(profile);
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ error: "Internal error fetching profile." });
  }
});

// ——— Manual toggle mobile verified ———
router.post("/verify-mobile-manual", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });
  try {
    const profile = await getProfile(email);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }
    await upsertProfile({
      ...profile,
      mobileVerified: profile.mobileVerified ? 0 : 1,
    });
    res.json({ message: "Mobile verification status updated." });
  } catch (err) {
    console.error("❌ Error toggling mobile verification:", err);
    res.status(500).json({ error: "Internal error toggling verification." });
  }
});

// ——— Create new user profile on signup ———
router.post("/create-user-profile", async (req, res) => {
  const { email, firstName, lastName, mobileNumber } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });
  try {
    // ensure user record exists
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
    console.error("❌ Error creating user profile:", err);
    res.status(500).json({ error: "Internal error creating profile." });
  }
});

export default router;
