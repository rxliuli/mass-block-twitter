import { derived, type Writable, writable } from 'svelte/store'
import { set, get } from 'idb-keyval'

export interface LocalStoreAdapter<T> {
  type: 'indexedDB' | 'localStorage' | 'browserStorage'
  write(key: string, value: T): void | Promise<void>
  read(key: string): T | Promise<T>
}

const storeCache = new Map<string, any>()

export function localStore<T>(
  key: string,
  initial: T | ((value?: T) => T),
  adapter: LocalStoreAdapter<T>,
): Writable<T> & {
  getValue(): Promise<T>
} {
  const cacheKey = `${adapter.type}:${key}`
  if (storeCache.has(cacheKey)) {
    return storeCache.get(cacheKey)
  }

  const s1 = writable(
    typeof initial === 'function' ? (initial as any)() : initial,
  )
  const { set, update } = s1
  const r = adapter.read(key)
  const init = (r: T | undefined | null) =>
    r !== null && r !== undefined && set(r)
  r instanceof Promise ? r.then(init) : init(r)
  const store = derived(s1, ($value) =>
    typeof initial === 'function'
      ? (initial as any)($value)
      : $value ?? initial,
  )
  const storeInstance = {
    subscribe: store.subscribe,
    set: (value: T) => {
      adapter.write(key, value)
      return set(value)
    },
    update: (updater: (value: T) => T) => {
      return update((draft) => {
        const value = updater(draft)
        adapter.write(key, value)
        return value
      })
    },
    async getValue() {
      const r = await adapter.read(key)
      set(r)
      if (typeof initial === 'function') {
        return (initial as any)(r)
      }
      return r ?? initial
    },
  }

  storeCache.set(cacheKey, storeInstance)
  return storeInstance
}

export function clearLocalStore() {
  storeCache.clear()
}

export function indexedDBAdapter<T>(): LocalStoreAdapter<T> {
  return {
    type: 'indexedDB',
    write(key, value) {
      return set(key, value)
    },
    async read(key) {
      return (await get(key)) as T
    },
  }
}

export function localStorageAdapter<T>(): LocalStoreAdapter<T> {
  return {
    type: 'localStorage',
    write(key: string, value: T): void {
      localStorage.setItem(key, JSON.stringify(value))
    },
    read(key: string): T {
      const item = localStorage.getItem(key)
      try {
        return item ? JSON.parse(item) : null
      } catch {
        return null as any
      }
    },
  }
}

export function browserStorageAdapter<T>(): LocalStoreAdapter<T> {
  return {
    type: 'browserStorage',
    async write(key, value) {
      await browser.storage.local.set({ [key]: value })
    },
    async read(key) {
      const r = await browser.storage.local.get(key)
      return r[key] as T
    },
  }
}
