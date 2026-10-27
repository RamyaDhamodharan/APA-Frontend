import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/admin/associates": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/api/auth": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/api/users/me": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/api/users/temporary-password": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
