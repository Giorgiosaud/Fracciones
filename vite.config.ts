import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  // The Cloudflare plugin configures a Worker environment (nodejs_compat
  // resolve.external) that conflicts with Vitest's pool — only load it
  // outside of test runs.
  plugins: [react(), ...(process.env.VITEST ? [] : [cloudflare()])],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})