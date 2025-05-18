// src/backend/firebaseAdmin.js
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// Resolve the path to the JSON file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.join(
  __dirname,
  "../config/serviceAccountKey.json",
);

// Read and parse the service account JSON
let serviceAccount;
try {
  const fileContents = readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(fileContents);
} catch (err) {
  console.error(
    `❌ Failed to load Firebase service account key from ${serviceAccountPath}:`,
    err,
  );
  process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
