import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // listen on all interfaces so Replit can reach it
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
    // allow any host (no need to pin to a specific .pike.replit.dev URL)
    allowedHosts: "all",

    // inject a relaxed Content Security Policy so Firebase can talk to Google
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; " +
        "connect-src 'self' https://identitytoolkit.googleapis.com;",
    },
  },
});
