import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
  test: {
    coverage: {
      excludeAfterRemap: true,
      exclude: ['src/lib/components/ui/**', '.wxt/**', 'node_modules/**'],
    },
  },
})
