// src/features/admin/components/EditStationeryModal.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const EditStationeryModal = ({ product, onClose, onUpdate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setDescription(product.description || "");
      setPrice(product.price || "");
      setDiscount(product.discount || "");
      setSku(product.sku || "");
      setQuantity(product.quantity || 0);
      setExistingImages(Array.isArray(product.images) ? product.images : []);
      setNewImages([]);
    }
  }, [product]);

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price || !sku) {
      toast.error("Name, price, and SKU are required");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("discount", discount);
    formData.append("sku", sku);
    formData.append("quantity", quantity);
    formData.append("existing", JSON.stringify(existingImages));
    newImages.forEach((img) => formData.append("images", img));

    try {
      setLoading(true);
      const res = await axios.put(
        `/api/admin/stationery/update/${product.id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      toast.success(res.data.message || "Product updated");
      onClose();
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl">
        <h3 className="text-xl font-semibold mb-4">Edit Product</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
          />
          <textarea
            className="w-full border p-2 rounded"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
          />
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU"
          />
          <input
            type="number"
            className="w-full border p-2 rounded"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
          />
          <input
            type="number"
            className="w-full border p-2 rounded"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="Discount (%)"
          />
          <input
            type="number"
            className="w-full border p-2 rounded"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
            placeholder="Quantity"
            min="0"
          />

          {/* Existing Image Previews */}
          {existingImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt="existing"
                    className="w-24 h-24 object-cover rounded"
                  />
                  <button
                    type="button"
                    className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded"
                    onClick={() => removeExistingImage(idx)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New File Upload */}
          <input
            type="file"
            className="w-full border p-2 rounded"
            onChange={(e) => setNewImages(Array.from(e.target.files))}
            multiple
            accept="image/*"
          />

          <div className="flex justify-between">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="px-4 py-2 border rounded"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStationeryModal;
