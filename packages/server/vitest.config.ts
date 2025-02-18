import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

async function getInitSql() {
  const list = (await readdir(path.resolve(__dirname, 'migrations'))).sort(
    (a, b) => a.localeCompare(b),
  )
  return (
    await Promise.all(
      list.map((file) =>
        readFile(path.resolve(__dirname, 'migrations', file), 'utf-8'),
      ),
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
