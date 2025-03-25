import { defineConfig } from '@playwright/test'

export default defineConfig({
  webServer: {
    command: 'pnpm build && pnpm preview',
    port: 4173,
  },
  testIgnore: ['src/**/*.test.ts'],
  testDir: 'e2e',
})
