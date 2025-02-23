import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

async function getInitSql() {
  const dirName = path.resolve(__dirname, 'drizzle')
  const list = (await readdir(dirName))
    .filter((it) => it.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))
  return (
    await Promise.all(
      list.map((name) => readFile(path.resolve(dirName, name), 'utf-8')),
    )
  ).join('\n')
}

export default defineWorkersConfig(async () => {
  return {
    test: {
      include: ['./test/**/*.test.ts'],
      poolOptions: {
        workers: {
          wrangler: { configPath: './wrangler.toml' },
          miniflare: {
            bindings: {
              APP_ENV: 'development',

              TEST_INIT_SQL: await getInitSql(),
            },
          },
        },
      },
    },
  }
})
