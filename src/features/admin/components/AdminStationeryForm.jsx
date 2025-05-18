// src/features/admin/components/AdminStationeryForm.jsx
import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AdminStationeryForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !price || !sku) {
      setMessage("❌ Name, Price, and SKU are mandatory.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("discount", discount);
    formData.append("sku", sku);
    formData.append("quantity", quantity);

    images.forEach((image) => {
      formData.append("images", image);
    });

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post("/api/admin/stationery/add", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage(response.data.message || "✅ Product uploaded successfully!");
      setName("");
      setDescription("");
      setPrice("");
      setDiscount("");
      setSku("");
      setQuantity(0);
      setImages([]);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to upload product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">➕ Add Stationery Product</h2>

      {message && (
        <div className="mb-4 text-center font-semibold">{message}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Product Name *"
          className="w-full p-2 border rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <textarea
          placeholder="Short Description"
          className="w-full p-2 border rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>

        <input
          type="text"
          placeholder="SKU *"
          className="w-full p-2 border rounded"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />

        <input
          type="number"
          placeholder="Price (₹) *"
          className="w-full p-2 border rounded"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <input
          type="number"
          placeholder="Discount (%)"
          className="w-full p-2 border rounded"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />

        <input
          type="number"
          placeholder="Quantity *"
          className="w-full p-2 border rounded"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
          min={0}
        />

        <input
          type="file"
          multiple
          accept="image/*"
          className="w-full p-2 border rounded"
          onChange={handleImageChange}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload Product"}
        </button>
      </form>
    </div>
  );
};

export default AdminStationeryForm;
