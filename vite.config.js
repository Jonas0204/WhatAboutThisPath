import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this as a project site at /WhatAboutThisPath/, not the
// domain root, so built asset/fetch URLs need that prefix. Only applied for
// `vite build` — `npm run dev` keeps serving from '/' as before.
const BASE_PATH = '/WhatAboutThisPath/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE_PATH : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Faroe Islands Hiking Tracks',
        short_name: 'Faroe Hikes',
        description: 'Plan and follow Faroe Islands hiking trails, on and offline.',
        theme_color: '#1a1d23',
        background_color: '#1a1d23',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,geojson}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maptiler-tiles',
              expiration: {
                maxEntries: 3000,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Weather should prefer a fresh network answer when online (forecasts
            // change), but still fall back to the last-known one when offline —
            // the app's own localStorage cache (src/lib/weatherCache.js) already
            // covers the "stay fresh for ~30min" case; this is the offline safety net.
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 6,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}))
