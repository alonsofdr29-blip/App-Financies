import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const REPO_NAME = "App-Financies";
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  // GitHub Pages serves the app under /<repo>/ in CI builds.
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
        name: "Mi dinero - Finanzas",
        short_name: "Finanzas",
        description: "App sencilla de finanzas personales",
        theme_color: "#0B0F1A",
        background_color: "#0B0F1A",
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
