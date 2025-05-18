// src/backend/firebaseAdmin.js

import admin from "firebase-admin";
import serviceAccount from "../config/serviceAccountKey.json";

// Initialize Firebase Admin SDK using service account key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
