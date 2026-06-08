import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Single Vite config for the React SPA. Splits vendor and per-route bundles
// so the LCP-critical first paint doesn't drag in the Archive view or icons
// that only show up later.

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom")) return "vendor-react-dom";
            if (id.includes("react")) return "vendor-react";
            if (id.includes("lucide-react")) return "vendor-lucide";
            return "vendor";
          }
          if (id.includes("src/Archive.jsx")) return "archive";
          return undefined;
        }
      }
    }
  }
});
