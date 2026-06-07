import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // The Cloudflare plugin configures a Worker environment (nodejs_compat
  // resolve.external) that conflicts with Vitest's pool, and the PWA plugin
  // has nothing to do during tests — both are skipped under Vitest.
  plugins: [
    react(),
    ...(process.env.VITEST
      ? []
      : [
          cloudflare(),
          VitePWA({
            registerType: 'autoUpdate',
            // Precache the SPA shell so it loads with no network at all;
            // the leaderboard API calls stay network-only (handled by the
            // existing checkName/submitScore/fetchTop fallbacks) — caching
            // stale leaderboard data would be more confusing than useful
            // for a kid checking "did I make the top 10?".
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
              navigateFallbackDenylist: [/^\/api\//],
            },
            manifest: {
              name: 'Fracciones VS',
              short_name: 'Fracciones',
              description: 'Duelo de fracciones a dos jugadores: responde rápido, gana puntos y derrota a tu rival.',
              start_url: '/',
              display: 'standalone',
              background_color: '#0f172a',
              theme_color: '#0f172a',
              icons: [
                { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
                { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
              ],
            },
          }),
        ]),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
