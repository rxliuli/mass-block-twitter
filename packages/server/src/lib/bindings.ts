import { NodePgDatabase } from 'drizzle-orm/node-postgres'

export type Bindings = {
  MY_KV: KVNamespace
  DB: D1Database
  MY_BUCKET: R2Bucket
  HYPERDRIVE: Hyperdrive

  APP_ENV?: 'development' | 'production'
  PADDEL_API_URL: string
  PADDEL_API_KEY: string
  RESEND_API_KEY: string
  JWT_SECRET: string
  OPENAI_BASE_URL: string
  OPENAI_API_KEY: string
  OPENAI_MODEL: string
  ADMIN_TOKEN: string

  TEST_INIT_SQL: string
}

export interface TokenInfo {
  sub: string // localUserId
}

export type JwtPayload = TokenInfo & {
  iat: number
  exp: number
}

export type HonoEnv = {
  Bindings: Bindings
  Variables: {
    tokenInfo: TokenInfo

    jwtPayload: JwtPayload

    db: NodePgDatabase
  }
}
