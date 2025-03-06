import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import { docsSidebar } from './src/lib/docs/plugin'

export default defineConfig({
  plugins: [sveltekit(), docsSidebar()],

  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
})
