import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Keep bundle lean for 3G: no code-splitting needed for a single page
    target: "es2020",
  },
  server: {
    port: 5173,
  },
});
