// src/features/admin/components/AdminStationeryForm.jsx
import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AdminStationeryForm = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sku, setSku] = useState("");

  // Variants: array of { color, sku, imageFile }
  const [variants, setVariants] = useState([
    { color: "", sku: "", imageFile: null },
  ]);

  const [loading, setLoading] = useState(false);

  const addVariantRow = () => {
    setVariants((prev) => [...prev, { color: "", sku: "", imageFile: null }]);
  };

  const updateVariant = (index, field, value) => {
    const copy = [...variants];
    copy[index][field] = value;
    setVariants(copy);
  };

  const removeVariantRow = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Basic validation
    if (!name || !price || !sku) {
      toast.error("Name, Price & SKU are required.");
      return;
    }
    setLoading(true);

    try {
      // Parse numeric fields
      const finalDiscount = parseFloat(discount) || 0;
      const finalQuantity = parseInt(quantity, 10) || 0;

      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("discount", finalDiscount);
      formData.append("quantity", finalQuantity);
      formData.append("sku", sku);

      // Append variants metadata and files
      formData.append(
        "variants",
        JSON.stringify(variants.map((v) => ({ color: v.color, sku: v.sku }))),
      );

      variants.forEach((v) => {
        if (v.imageFile) formData.append("variantImages", v.imageFile);
      });

      const res = await axios.post("/api/admin/stationery/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data.message || "Product uploaded successfully!");
      // Reset form
      setName("");
      setDescription("");
      setPrice("");
      setDiscount("");
      setQuantity("");
      setSku("");
      setVariants([{ color: "", sku: "", imageFile: null }]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">➕ Add Stationery Product</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic fields */}
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
        />

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
          onChange={(e) => setQuantity(e.target.value)}
          min={0}
        />

        {/* Variants section */}
        <div>
          <h3 className="font-semibold mb-2">Variants</h3>
          {variants.map((v, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="Color"
                className="border p-1 rounded flex-1"
                value={v.color}
                onChange={(e) => updateVariant(i, "color", e.target.value)}
              />
              <input
                type="text"
                placeholder="Variant SKU"
                className="border p-1 rounded flex-1"
                value={v.sku}
                onChange={(e) => updateVariant(i, "sku", e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  updateVariant(i, "imageFile", e.target.files[0])
                }
              />
              <button
                type="button"
                onClick={() => removeVariantRow(i)}
                className="text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addVariantRow}
            className="text-blue-600"
          >
            + Add Variant
          </button>
        </div>

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
