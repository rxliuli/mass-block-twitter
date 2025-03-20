import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearLocalStore,
  indexedDBAdapter,
  localStorageAdapter,
  localStore,
} from '$lib/util/localStore'
import { get } from 'svelte/store'
import { clear, get as idbGet } from 'idb-keyval'

beforeEach(async () => {
  await clear()
  localStorage.clear()
  clearLocalStore()
})

describe('indexedDBAdapter', () => {
  it('indexedDBAdapter', async () => {
    const store = localStore(
      'settings',
      { theme: 'system' },
      indexedDBAdapter(),
    )
    expect(get(store)).toEqual({ theme: 'system' })
    store.set({ theme: 'dark' })
    expect(get(store)).toEqual({ theme: 'dark' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(await idbGet('settings')).toEqual({ theme: 'dark' })
    const store2 = localStore(
      'settings',
      { theme: 'light' },
      indexedDBAdapter(),
    )
    expect(get(store2)).toEqual({ theme: 'dark' })
  })

  it('localStore for default value', async () => {
    const store = localStore(
      'settings',
      { theme: 'system' },
      indexedDBAdapter(),
    )
    expect(get(store)).toEqual({ theme: 'system' })
  })

  it('localStore single instance for same key', async () => {
    const store1 = localStore(
      'settings',
      { theme: 'system' },
      indexedDBAdapter(),
    )
    const store2 = localStore(
      'settings',
      { theme: 'system' },
      indexedDBAdapter(),
    )
    store1.set({ theme: 'dark' })
    expect(get(store1)).toEqual({ theme: 'dark' })
    expect(get(store2)).toEqual({ theme: 'dark' })
    expect(store1 === store2).true
  })
})

describe('localStorageAdapter', () => {
  it('localStorageAdapter', async () => {
    const store = localStore(
      'settings',
      { theme: 'system' },
      localStorageAdapter(),
    )
    expect(get(store)).toEqual({ theme: 'system' })
    store.set({ theme: 'dark' })
    expect(get(store)).toEqual({ theme: 'dark' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(localStorage.getItem('settings')).toEqual(
      JSON.stringify({ theme: 'dark' }),
    )
  })
  it('update', async () => {
    const store = localStore(
      'settings',
      { theme: 'system' },
      indexedDBAdapter(),
    )
    store.update((draft) => {
      draft.theme = 'dark'
      return draft
    })
    expect(get(store)).toEqual({ theme: 'dark' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(await idbGet('settings')).toEqual({ theme: 'dark' })
  })

  it('localStore for function initial value', async () => {
    localStorage.setItem('settings', JSON.stringify({ a: true }))
    const s1 = localStore(
      'settings',
      { a: true, b: false },
      localStorageAdapter(),
    )
    expect(get(s1)).toEqual({ a: true })
    clearLocalStore()
    const s2 = localStore(
      'settings',
      (value) => ({ a: true, b: false, ...(value ?? {}) }),
      localStorageAdapter(),
    )
    expect(get(s2)).toEqual({ a: true, b: false })
  })
})
