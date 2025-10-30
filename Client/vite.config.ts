import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // allow access on local network
    port: 8080,
    open: true, // auto open browser
    cors: true, // allow socket + API calls
  },
  plugins: [
    react({
      jsxImportSource: "@emotion/react", // ensures emotion compatibility (safe for Framer)
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode === "development",
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ["emoji-picker-react", "framer-motion", "socket.io-client"],
  },
}));
