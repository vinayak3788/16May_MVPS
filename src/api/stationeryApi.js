// src/api/stationeryApi.js
import axios from "axios";

/**
 * Fetch all stationery products for AdminDashboard
 * @returns {{ products: Array }} An object containing the products array
 */
export const getAllStationery = async () => {
  const { data } = await axios.get("/api/stationery/products");
  return data; // data.products is the array
};
