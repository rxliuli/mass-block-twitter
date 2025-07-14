import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { readFile } from 'node:fs/promises'

async function getInitSql() {
  // const dirName = path.resolve(__dirname, 'drizzle')
  // const list = (await readdir(dirName))
  //   .filter((it) => it.endsWith('.sql'))
  //   .sort((a, b) => a.localeCompare(b))
  // return (
  //   await Promise.all(
  //     list.map((name) => readFile(path.resolve(dirName, name), 'utf-8')),
  //   )
  // ).join('\n')
  return await readFile('./d1/pg-schema.sql', 'utf-8')
}

export default defineWorkersConfig(async () => {
  return {
    test: {
      include: ['./test/**/*.test.ts'],
      poolOptions: {
        workers: {
          singleWorker: true,
          wrangler: { configPath: './wrangler.jsonc' },
          miniflare: {
            bindings: {
              APP_ENV: 'development',
              JWT_SECRET: 'RNpiG6kspWuxjWEcL8I4s', // Add JWT secret for tests
              TEST_INIT_SQL: await getInitSql(),
            },
          },
        },
      },
    },
  }
})
