import { describe, expect, it, vi } from 'vitest'
import { HonoEnv } from '../src/lib/bindings'

describe('miniflare', () => {
  it('should be create user by d1 batch', async () => {
    vi.useFakeTimers()
    const { env } = await import('cloudflare:test')
    const _env = env as HonoEnv['Bindings']
    await _env.MY_KV.put('a', 'a', { expirationTtl: 60 })
    expect(await _env.MY_KV.get('a')).eq('a')
    vi.setSystemTime(new Date(Date.now() + 1000 * 60 * 60 * 24))
    // TODO https://github.com/cloudflare/workers-sdk/issues/5394
    // expect(await _env.MY_KV.get('a')).undefined
    vi.useRealTimers()
  })
})
