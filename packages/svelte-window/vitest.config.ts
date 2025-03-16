import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  test: {
    workspace: [
      {
        test: {
          include: ['src/**/*.test.ts'],
          exclude: [
            'src/**/*.browser.test.ts',
            'src/**/*.browser.svelte.test.ts',
          ],
          name: 'unit',
          environment: 'node',
        },
        plugins: [svelte()],
      },
      {
        test: {
          include: [
            'src/**/*.browser.test.ts',
            'src/**/*.browser.svelte.test.ts',
          ],
          name: 'browser',
          browser: {
            enabled: true,
            name: 'chromium',
            provider: 'playwright',
            headless: true,
            instances: [
              { browser: 'chromium' },
              // { browser: 'firefox' },
              // { browser: 'webkit' },
            ],
          },
        },
        plugins: [svelte()],
      },
    ],
  },
})
