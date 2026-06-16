import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, proxy the WebSocket + API to the FastAPI backend on :8000 so the
// client can always talk to `/ws` regardless of how it is served.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/ws": { target: "ws://localhost:8000", ws: true },
      "/api": { target: "http://localhost:8000" },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
