import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'app-icon.svg',
        'safari-pinned-tab.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'offline.html'
      ],
      manifest: {
        name: 'Arkana ESS',
        short_name: 'ARK ESS',
        description: 'Employee Self Service App for Arkana',
        theme_color: '#0081A7',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
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
          }
        ],
        shortcuts: [
          {
            name: 'Ajukan Cuti',
            short_name: 'Cuti',
            url: '/cuti',
            description: 'Langsung ke form cuti',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Lihat Payslip',
            short_name: 'Payslip',
            url: '/payslip',
            description: 'Akses slip gaji',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ],
        prefer_related_applications: true,
        related_applications: [
          {
            platform: 'webapp',
            url: 'https://ess.arkana.my/manifest.webmanifest'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /^\/odoo\//
        ],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/odoo\.arkana\.my\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'odoo-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: process.env.NODE_ENV === 'development',
        type: 'module',
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//]
      },
      strategies: 'generateSW',
      srcDir: 'src',
      filename: 'sw.js'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(import.meta.dirname, 'assets')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom')
            ) {
              return 'vendor';
            }
            if (id.includes('@ionic')) {
              return 'ui';
            }
            if (id.includes('html2canvas') || id.includes('dompurify')) {
              return 'utils';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['ess.arkana.my', 'localhost', '127.0.0.1']
  }
});
