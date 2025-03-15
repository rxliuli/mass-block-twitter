import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['src/**/*.test.ts'],
      exclude: ['test/**/*.test.ts'],
      name: 'unit',
      environment: 'node',
    },
  },
  {
    extends: 'vitest.config.ts',
    test: {
      name: 'cf',
      include: ['test/**/*.test.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
])
