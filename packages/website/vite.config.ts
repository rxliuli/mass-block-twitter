import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import { docsSidebar } from './src/lib/docs/docsSidebar'
import { markdown } from './src/lib/docs/markdown'

export default defineConfig({
  plugins: [sveltekit(), docsSidebar(), markdown()] as any,
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
})
