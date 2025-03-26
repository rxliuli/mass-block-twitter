import { defineWorkspace } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { customCommands } from '$lib/test/commands'

const browserIncludes = [
  'src/**/*.browser.test.ts',
  'src/**/*.browser.svelte.test.ts',
]

export default defineWorkspace([
  {
    extends: 'vitest.config.ts',
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: ['src/**/*.test.ts'],
      exclude: browserIncludes,
      name: 'unit',
      environment: 'node',
    },
    plugins: [svelte()],
  },
  {
    extends: 'vitest.config.ts',
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: browserIncludes,
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
        commands: customCommands,
      },
    },
    plugins: [svelte()],
  },
])
