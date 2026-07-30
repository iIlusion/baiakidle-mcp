import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/userscript.ts",
      name: "BaiakIdleMcpBridge",
      formats: ["iife"],
      fileName: () => "baiakidle-bridge.user.js"
    },
    outDir: "dist",
    emptyOutDir: false,
    minify: false
  }
});