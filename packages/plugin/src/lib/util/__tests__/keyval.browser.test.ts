import { createKeyVal } from '$lib/util/keyval'
import { wait } from '@liuli-util/async'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('keyval', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it('should be able to set and get a value', async () => {
    const keyval = createKeyVal({ dbName: 'test', storeName: 'test' })
    await keyval.set('test', 'test')
    expect(await keyval.get('test')).toBe('test')
    await keyval.del('test')
    expect(await keyval.get('test')).null
  })
  it('should be able to set and get a json value', async () => {
    const keyval = createKeyVal({ dbName: 'test', storeName: 'test' })
    await keyval.set('test', { test: 'test' })
    expect(await keyval.get('test')).toEqual({ test: 'test' })
  })
  it('should be able to set and get a value with expiration', async () => {
    const keyval = createKeyVal({ dbName: 'test', storeName: 'test' })
    await keyval.set('test', 'test', { expirationTtl: 1 })
    expect(await keyval.get('test')).eq('test')
    vi.setSystemTime(Date.now() + 1000)
    expect(await keyval.get('test')).null
  })
  it('should be able to set and get a value with global expiration', async () => {
    const keyval = createKeyVal({
      dbName: 'test',
      storeName: 'test',
      expirationTtl: 1,
    })
    await keyval.set('test', 'test')
    expect(await keyval.get('test')).eq('test')
    vi.setSystemTime(Date.now() + 1000)
    expect(await keyval.get('test')).null
  })
  it('should be able to get all keys', async () => {
    const keyval = createKeyVal({ dbName: 'test', storeName: 'test' })
    await keyval.set('test', 'test')
    await keyval.set('test2', 'test2', { expirationTtl: 1 })
    expect(await keyval.keys()).toEqual(['test', 'test2'])
    vi.setSystemTime(Date.now() + 1000)
    expect(await keyval.keys()).toEqual(['test'])
  })
  it('should be able to duplicate set and get a value with different expiration', async () => {
    const keyval = createKeyVal({ dbName: 'test', storeName: 'test' })
    await keyval.set('test', 'test', { expirationTtl: 1 })
    expect(await keyval.get('test')).eq('test')
    vi.setSystemTime(Date.now() + 500)
    await keyval.set('test', 'test2', { expirationTtl: 1 })
    expect(await keyval.get('test')).eq('test2')
    vi.setSystemTime(Date.now() + 500)
    expect(await keyval.get('test')).eq('test2')
    vi.setSystemTime(Date.now() + 500)
    expect(await keyval.get('test')).null
  })
  it('should be able to get a value with global different expiration', async () => {
    const kv1 = createKeyVal({
      dbName: 'test',
      storeName: 'test',
      expirationTtl: 1,
    })
    await kv1.set('test', 'test')
    expect(await kv1.get('test')).eq('test')
    vi.setSystemTime(Date.now() + 1000)
    const kv2 = createKeyVal({
      dbName: 'test',
      storeName: 'test',
      expirationTtl: 3,
    })
    expect(await kv2.get('test')).eq('test')
  })
  it('should be able to get many values', async () => {
    const keyval = createKeyVal({ dbName: 'test', storeName: 'test' })
    await keyval.set('test', 'test')
    await keyval.set('test2', 'test2', { expirationTtl: 1 })
    expect(await keyval.getMany(['test', 'test2'])).toEqual([
      { key: 'test', value: 'test' },
      { key: 'test2', value: 'test2' },
    ])
    vi.setSystemTime(Date.now() + 1000)
    expect(await keyval.getMany(['test', 'test2'])).toEqual([
      { key: 'test', value: 'test' },
      { key: 'test2' },
    ])
  })
  it('should be able to set many values', async () => {
    const keyval = createKeyVal({ dbName: 'test', storeName: 'test' })
    await keyval.setMany([
      { key: 'test', value: 'test' },
      { key: 'test2', value: 'test2', options: { expirationTtl: 1 } },
    ])
    expect(await keyval.getMany(['test', 'test2'])).toEqual([
      { key: 'test', value: 'test' },
      { key: 'test2', value: 'test2' },
    ])
    vi.setSystemTime(Date.now() + 1000)
    expect(await keyval.getMany(['test', 'test2'])).toEqual([
      { key: 'test', value: 'test' },
      { key: 'test2' },
    ])
  })
  it('should be able to clear', async () => {
    const keyval = createKeyVal({ dbName: 'test', storeName: 'test' })
    await keyval.set('test', 'test')
    await keyval.set('test2', 'test2', { expirationTtl: 1 })
    await keyval.clear()
    expect(await keyval.keys()).length(0)
  })
})
