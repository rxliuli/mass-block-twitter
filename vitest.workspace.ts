import { defineWorkspace } from 'vitest/config'

const browserIncludes = [
  'src/**/*.browser.test.ts',
  'src/**/*.browser.svelte.test.ts',
  'src/**/__tests__/*.browser.ts',
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
  },
  {
    extends: 'vitest.config.ts',
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: browserIncludes,
      exclude: ['src/**/*.test.ts'],
      name: 'browser',
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright',
        headless: true,
        // https://playwright.dev
        providerOptions: {},
      },
    },
  },
])
