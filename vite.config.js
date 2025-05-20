import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // ——— Build: split out node_modules into a vendor chunk ———
  build: {
    // (optional) bump the warning threshold if 500 KB is too low for you
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // any import from node_modules → goes into vendor.[hash].js
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },

  server: {
    // listen on all interfaces so Replit can reach it
    host: "0.0.0.0",
    port: 5173,

    // Proxy your API calls to your local Express
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },

    // allow your Replit host (and localhost)
    allowedHosts: [".sisko.replit.dev", "localhost"],

    // inject a relaxed CSP so Firebase can talk to Google
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; " +
        "connect-src 'self' https://identitytoolkit.googleapis.com;",
    },
  },
});
