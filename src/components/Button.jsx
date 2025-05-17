// src/components/Button.jsx
import React from "react";

const VARIANTS = {
  primary: "bg-purple-600 hover:bg-purple-700 text-white",
  secondary:
    "bg-white hover:bg-gray-100 text-purple-600 border border-purple-600",
  success: "bg-green-600 hover:bg-green-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

export default function Button({
  children,
  onClick,
  className = "",
  variant = "primary", // default to your main brand color
  ...props
}) {
  const baseStyles =
    "px-4 py-2 rounded shadow-sm font-medium transition focus:outline-none";
  const variantStyles = VARIANTS[variant] || VARIANTS.primary;

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
