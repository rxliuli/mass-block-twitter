import { Storage } from 'happy-dom'
import 'fake-indexeddb/auto'
import { beforeEach, expect, it } from 'vitest'
import {
  indexedDBAdapter,
  localStorageAdapter,
  _localStore,
} from '$lib/util/store.svelte'
import { get as idbGet, clear } from 'idb-keyval'

beforeEach(async () => {
  Reflect.set(globalThis, 'localStorage', new Storage())
  await clear()
  localStorage.clear()
})

it('indexedDBAdapter', async () => {
  const store = _localStore('settings', { theme: 'system' }, indexedDBAdapter())
  expect(store.value).toEqual({ theme: 'system' })
  store.value = { theme: 'dark' }
  expect(store.value).toEqual({ theme: 'dark' })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(await idbGet('settings')).toEqual({ theme: 'dark' })
  const store2 = _localStore('settings', { theme: 'light' }, indexedDBAdapter())
  expect(store2.value).toEqual({ theme: 'light' })
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(store2.value).toEqual({ theme: 'dark' })
})

it('localStorageAdapter', async () => {
  const store = _localStore(
    'settings',
    { theme: 'system' },
    localStorageAdapter(),
  )
  expect(store.value).toEqual({ theme: 'system' })
  store.value = { theme: 'dark' }
  expect(store.value).toEqual({ theme: 'dark' })
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(localStorage.getItem('settings')).toEqual(
    JSON.stringify({ theme: 'dark' }),
  )
})

it.skip('update', async () => {
  const store = _localStore('settings', { theme: 'system' }, indexedDBAdapter())
  store.value.theme = 'dark'
  expect(store.value).toEqual({ theme: 'dark' })
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(await idbGet('settings')).toEqual({ theme: 'dark' })
})

it('localStore for default value', async () => {
  const store = _localStore('settings', { theme: 'system' }, indexedDBAdapter())
  expect(store.value).toEqual({ theme: 'system' })
})

it.skip('localStore for function initial value', async () => {
  localStorage.setItem('settings', JSON.stringify({ a: true }))
  const s1 = _localStore(
    'settings',
    { a: true, b: false },
    localStorageAdapter(),
  )
  expect(s1.value).toEqual({ a: true })
  const s2 = _localStore(
    'settings',
    (value) => ({ a: true, b: false, ...(value ?? {}) }),
    localStorageAdapter(),
  )
  expect(s2.value).toEqual({ a: true, b: false })
})
