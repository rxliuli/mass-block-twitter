import { defineWorkspace } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

const browserIncludes = [
  'src/**/*.browser.test.ts',
  'src/**/*.browser.svelte.test.ts',
]

export default defineWorkspace([
  {
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: ['src/**/*.test.ts'],
      exclude: browserIncludes,
      name: 'unit',
      environment: 'node',
      alias: {
        '@': path.resolve(__dirname, './src/lib'),
        $lib: path.resolve(__dirname, './src/lib'),
      },
    },
    plugins: [svelte()] as any,
  },
  {
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
      },
      alias: {
        '@': path.resolve(__dirname, './src/lib'),
        $lib: path.resolve(__dirname, './src/lib'),
      },
    },
    plugins: [svelte()] as any,
  },
])
