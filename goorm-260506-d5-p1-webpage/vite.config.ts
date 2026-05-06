import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const apiTarget = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8793";

export default defineConfig({
  /** 하위 경로·정적 허브에서 열어도 JS/CSS 상대 로딩 (흰 화면 방지) */
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: ".build",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
