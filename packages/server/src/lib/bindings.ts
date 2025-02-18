export type Bindings = {
  MY_KV: KVNamespace
  DB: D1Database

  APP_ENV?: 'development' | 'production'
  PADDEL_API_URL: string
  PADDEL_API_KEY: string
  RESEND_API_KEY: string

  TEST_INIT_SQL: string
}

export interface TokenInfo {
  createdAt: string
  updatedAt: string
  id: string // userId
  email: string
}

export type HonoEnv = {
  Bindings: Bindings
  Variables: {
    tokenInfo: TokenInfo
  }
}
