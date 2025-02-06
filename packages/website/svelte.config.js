import adapter from '@sveltejs/adapter-cloudflare'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', '.md'],
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: [
    mdsvex({
      extensions: ['.md'],
      layout: path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        './src/lib/components/layout/Markdown.svelte',
      ),
    }),
    vitePreprocess(),
  ],

  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      '@/*': './src/lib/*',
    },
  },
}

export default config
