// src/backend/routes/userRoutes.js
import express from "express";
import pool, {
  ensureUserRole,
  getUserRole,
  updateUserRole,
  blockUser as dbBlockUser,
  unblockUser as dbUnblockUser,
  deleteUser as dbDeleteUser,
  isUserBlocked,
  upsertProfile,
  getProfile,
} from "../db.js";
import admin from "../firebaseAdmin.js";

const router = express.Router();

// ——— Fetch (and auto-create) a user’s role, with admin bypass ———
router.get("/get-role", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required." });

  try {
    await ensureUserRole(email);
    const role = await getUserRole(email);

    if (role === "admin" || role === "super-admin") {
      return res.json({ role });
    }

    if (await isUserBlocked(email)) {
      return res.status(403).json({ error: "User is blocked." });
    }

    const profileRow = (
      await pool.query(`SELECT mobileverified FROM profiles WHERE email = $1`, [
        email,
      ])
    ).rows[0];

    if (!profileRow || !profileRow.mobileverified) {
      return res.status(403).json({ error: "Mobile not verified." });
    }

    res.json({ role });
  } catch (err) {
    console.error("❌ Failed to get user role:", err);
    res.status(500).json({ error: "Internal error fetching role." });
  }
});

// ——— Fetch user profile ———
router.get("/get-profile", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Email required." });

  try {
    const { rows } = await pool.query(
      `SELECT
         email,
         firstname   AS "firstName",
         lastname    AS "lastName",
         mobilenumber AS "mobileNumber",
         mobileverified AS "mobileVerified"
       FROM profiles
       WHERE email = $1`,
      [email],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Profile not found." });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ error: "Internal error fetching profile." });
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
         p.mobilenumber   AS "mobileNumber",
         p.firstname      AS "firstName",
         p.lastname       AS "lastName",
         p.mobileverified AS "mobileVerified"
       FROM users u
       LEFT JOIN profiles p ON u.email = p.email
       ORDER BY u.email`,
    );
    res.json({ users: rows });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Internal error fetching users." });
  }
});

// ——— Change someone’s role ———
router.post("/update-role", async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role)
    return res.status(400).json({ error: "Email and role required." });

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

// ——— Block user ———
router.post("/block-user", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });

  try {
    await dbBlockUser(email);
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
    await dbUnblockUser(email);
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
    try {
      const userRec = await admin.auth().getUserByEmail(email);
      await admin.auth().deleteUser(userRec.uid);
    } catch (firebaseErr) {
      console.warn("⚠️ Firebase delete-user warning:", firebaseErr.message);
    }
    await dbDeleteUser(email);
    res.json({ message: "User deleted successfully." });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ error: "Internal error deleting user." });
  }
});

// ——— Toggle mobile verified ———
router.post("/verify-mobile-manual", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required." });

  try {
    // 1. Skip toggling for admins
    const role = await getUserRole(email);
    if (role === "admin" || role === "super-admin") {
      return res.json({ message: "Admin mobile verification not required." });
    }

    // 2. Fetch the existing profile
    const profile = await getProfile(email);
    if (!profile) return res.status(404).json({ error: "Profile not found." });

    // 3. Compute new verified status (0 or 1)
    const newStatus = profile.mobileVerified ? 0 : 1;

    // 4. Parse the existing mobileNumber into a 10-digit integer (or null)
    const rawMobile = String(profile.mobileNumber || "");
    const mobilenumber = /^\d{10}$/.test(rawMobile)
      ? parseInt(rawMobile, 10)
      : null;

    // 5. Upsert with the toggled flag and parsed number
    await upsertProfile({
      email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      mobileNumber: mobilenumber,
      mobileVerified: newStatus,
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
  if (!email) return res.status(400).json({ error: "Email required." });

  try {
    await ensureUserRole(email);

    // Validate & parse the 10-digit string into a Number, or null
    const mobilenumber = /^\d{10}$/.test(mobileNumber)
      ? parseInt(mobileNumber, 10)
      : null;

    // For a fresh signup, mobileVerified is always 0
    const mobileVerified = 0;

    await upsertProfile({
      email,
      firstName,
      lastName,
      mobileNumber: mobilenumber, // must be the JS Number or null
      mobileVerified, // must be 0 or 1
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error creating user profile:", err);
    res.status(500).json({ error: "Internal error creating profile." });
  }
});
export default router;
