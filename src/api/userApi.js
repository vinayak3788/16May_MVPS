// src/api/userApi.js
import axios from "axios";

// … your other imports …

// Fetch all users
export const getAllUsers = async () => {
  const response = await axios.get("/api/get-users");
  return response.data;
};

// Change a user’s role
export const updateUserRole = async (email, role) => {
  const response = await axios.post("/api/update-role", { email, role });
  return response.data;
};

// Block a user
export const blockUser = async (email) => {
  const response = await axios.post("/api/block-user", { email });
  return response.data;
};

// Unblock a user
export const unblockUser = async (email) => {
  const response = await axios.post("/api/unblock-user", { email });
  return response.data;
};

// Delete a user
export const deleteUser = async (email) => {
  const response = await axios.post("/api/delete-user", { email });
  return response.data;
};

// Manually toggle mobile verification
export const verifyMobileManual = async (email) => {
  const response = await axios.post("/api/verify-mobile-manual", { email });
  return response.data;
};

// Fetch all users (alias)
export const getAllUsers = async () => {
  const { users } = await axios.get("/api/get-users");
  return { users };
};
