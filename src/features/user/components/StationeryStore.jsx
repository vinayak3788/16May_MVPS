// src/features/user/components/StationeryStore.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useCart } from "../../../context/CartContext";

export default function StationeryStore() {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [modalProductId, setModalProductId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get("/api/stationery/products");
      const items = Array.isArray(res.data.products) ? res.data.products : [];
      setProducts(items);
      // initialize default variant per product
      const defaults = {};
      items.forEach((p) => {
        defaults[p.id] =
          Array.isArray(p.variants) && p.variants.length > 0
            ? p.variants[0]
            : { color: null, sku: p.sku, imageUrl: p.images[0] };
      });
      setSelectedVariants(defaults);
    } catch (error) {
      console.error("❌ Error fetching stationery products:", error);
      toast.error("Failed to load stationery.");
    } finally {
      setLoading(false);
    }
  };

  const handleVariantSelect = (productId, variant) => {
    setSelectedVariants((prev) => ({ ...prev, [productId]: variant }));
  };

  const handleAdd = (product) => {
    const variant = selectedVariants[product.id] || {};
    const orderNumber = `Order${Date.now().toString().slice(-6)}`;
    const finalPrice =
      product.discount > 0
        ? parseFloat(
            product.price - (product.price * product.discount) / 100,
          ).toFixed(2)
        : product.price.toFixed(2);

    addToCart("stationery", {
      type: "stationery",
      orderNumber,
      id: product.id,
      name: product.name,
      price: product.price,
      discount: product.discount,
      finalPrice,
      quantity: 1,
      variantSku: variant.sku,
      variantColor: variant.color,
    });

    toast.success(`🛒 ${product.name} added to cart`);
  };

  if (loading) {
    return <div className="text-center mt-10">Loading products...</div>;
  }

  if (!products.length) {
    return (
      <div className="text-center mt-10">
        No stationery products available yet.
      </div>
    );
  }

  // Find the product currently in modal (null if none)
  const modalProduct = modalProductId
    ? products.find((p) => p.id === modalProductId)
    : null;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        🛒 Stationery Store
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const imgs = Array.isArray(product.images) ? product.images : [];
          const variant = selectedVariants[product.id] || {};

          return (
            <div
              key={product.id}
              className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition-all flex flex-col bg-white"
            >
              {/* Color swatches */}
              {product.variants && product.variants.length > 0 && (
                <div className="flex justify-center p-2 space-x-2">
                  {product.variants.map((v) => (
                    <img
                      key={v.sku}
                      src={v.imageUrl}
                      alt={v.color}
                      title={v.color}
                      className={`w-8 h-8 object-cover rounded-full cursor-pointer border-2 ${
                        variant.sku === v.sku
                          ? "border-blue-600"
                          : "border-gray-300"
                      }`}
                      onClick={() => handleVariantSelect(product.id, v)}
                    />
                  ))}
                </div>
              )}

              {/* Main Image (click to open variant modal) */}
              <div
                className="w-full h-48 bg-gray-100 flex items-center justify-center cursor-pointer"
                onClick={() => setModalProductId(product.id)}
              >
                {variant.imageUrl ? (
                  <img
                    src={variant.imageUrl}
                    alt={product.name}
                    className="object-contain h-full"
                  />
                ) : imgs.length > 0 ? (
                  <img
                    src={imgs[0]}
                    alt={product.name}
                    className="object-contain h-full"
                  />
                ) : (
                  <span className="text-gray-400">No Image</span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold mb-1">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {product.description}
                </p>

                {product.discount > 0 ? (
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-600 font-bold">
                      ₹
                      {product.discount > 0
                        ? parseFloat(
                            product.price -
                              (product.price * product.discount) / 100,
                          ).toFixed(2)
                        : product.price.toFixed(2)}
                    </span>
                    <span className="line-through text-gray-500">
                      ₹{product.price.toFixed(2)}
                    </span>
                    <span className="text-red-500 text-sm">
                      ({product.discount}% OFF)
                    </span>
                  </div>
                ) : (
                  <div className="text-black font-bold mb-2">
                    ₹{product.price.toFixed(2)}
                  </div>
                )}

                <div className="text-sm text-gray-700 mb-4">
                  SKU: {variant.sku || product.sku}
                  <br />
                  In stock: {product.quantity}
                </div>

                <button
                  onClick={() => handleAdd(product)}
                  disabled={product.quantity === 0}
                  className="mt-auto bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {product.quantity === 0 ? "Out of stock" : "➕ Add to Cart"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Variant selection modal */}
      {modalProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg max-w-sm w-full">
            <h2 className="text-lg font-semibold mb-2">Choose a color</h2>
            <div className="flex space-x-2">
              {modalProduct.variants.map((v) => (
                <img
                  key={v.sku}
                  src={v.imageUrl}
                  title={v.color}
                  className="w-12 h-12 object-cover rounded-full cursor-pointer border-2 border-gray-300 hover:border-blue-600"
                  onClick={() => {
                    handleVariantSelect(modalProduct.id, v);
                    setModalProductId(null);
                  }}
                />
              ))}
            </div>
            <button
              className="mt-4 text-sm text-gray-600"
              onClick={() => setModalProductId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
