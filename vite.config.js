import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const REPO_NAME = "App-Financies";
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  base: isGithubActions ? `/${REPO_NAME}/` : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        cleanupOutdatedCaches: true,
      },
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "NeonCash - Finanzas personales",
        short_name: "NeonCash",
        description: "Aplicacion futurista para controlar gastos, ingresos, presupuestos y metas personales.",
        theme_color: "#050816",
        background_color: "#050816",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
