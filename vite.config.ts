import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  build: {
    lib: {
      entry: "src/userscript.ts",
      name: "BaiakIdleMcpBridge",
      formats: ["iife"],
      fileName: () => mode === "development" ? "baiakidle-bridge.dev.js" : "baiakidle-bridge.user.js"
    },
    outDir: "dist",
    emptyOutDir: false,
    minify: false
  }
}));