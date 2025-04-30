import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg', 'safari-pinned-tab.svg'],
      manifest: {
        name: 'Arkana ESS',
        short_name: 'ARK ESS',
        description: 'Arkana Employee Self Service Application',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-dashboard.png',
            sizes: '1280x720',
            type: 'image/png',
            label: 'Dashboard Screenshot'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true
      },
      devOptions: {
        enabled: true
      },
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js'
    })
  ],
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['ess.arkana.my', 'localhost', '127.0.0.1']
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "assets"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});
