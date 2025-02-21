export type Bindings = {
  MY_KV: KVNamespace
  DB: D1Database

  APP_ENV?: 'development' | 'production'
  PADDEL_API_URL: string
  PADDEL_API_KEY: string
  RESEND_API_KEY: string

  TEST_INIT_SQL: string

  JWT_SECRET: string
}

export interface TokenInfo {
  sub: string // localUserId
}

export type HonoEnv = {
  Bindings: Bindings
  Variables: {
    tokenInfo: TokenInfo

    jwtPayload: TokenInfo & {
      iat: number
      exp: number
    }
  }
}
