import { type Plugin } from 'vite'
import FastGlob from 'fast-glob'
import path from 'node:path'

export function docsSidebar(): Plugin {
  return {
    name: 'docsSidebar',
    async config(config) {
      const docs = await FastGlob('**/*.md', {
        cwd: path.join(config.root ?? process.cwd(), './src/docs'),
      })
      return {
        define: {
          'import.meta.env.DOCS': JSON.stringify(docs),
        },
      }
    },
  }
}
