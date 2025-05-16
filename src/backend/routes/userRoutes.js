// src/backend/routes/userRoutes.js
import express from "express";
import {
  updateUserRole,
  getUserRole,
  blockUser,
  unblockUser,
  deleteUser,
  ensureUserRole,
  listUsers,
  getProfile,
  updateProfile,
  toggleMobileVerification,
  createUserProfile,
} from "../db.js";

// 🛠️ Debug log to confirm this file is loaded
console.log("🛠️  userRoutes.js loaded — unblock route is in play");

const router = express.Router();

// ——— Role management APIs ———
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

// ——— List all users ———
router.get("/get-users", async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
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
  if (!email) return res.status(400).json({ error: "Email required" });
  try {
    await unblockUser(email);
    res.json({ message: "✅ User unblocked successfully." });
  } catch (err) {
    console.error("❌ Failed to unblock user:", err);
    res.json({ error: "Failed to unblock user." });
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
    await updateProfile(email, {
      mobileNumber,
      firstName,
      lastName,
      mobileVerified,
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

// ——— Manual toggle mobile verified ———
router.post("/verify-mobile-manual", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    const newFlag = await toggleMobileVerification(email);
    res.json({
      message: "✅ Mobile verification status updated!",
      mobileVerified: newFlag,
    });
  } catch (err) {
    console.error("❌ Failed to toggle mobile verification:", err);
    res.status(500).json({ error: "Failed to toggle mobile verification." });
  }
});

// ——— Create new user profile after signup ———
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
