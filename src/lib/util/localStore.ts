import { type Writable, writable } from 'svelte/store'
import { set, get } from 'idb-keyval'

interface LocalStoreAdapter<T> {
  write(key: string, value: T): void | Promise<void>
  read(key: string): T | Promise<T>
}

export function localStore<T>(
  key: string,
  initial: T,
  adapter: LocalStoreAdapter<T>,
): Writable<T> & {
  getValue(): Promise<T>
} {
  const { subscribe, set, update } = writable(initial)
  const r = adapter.read(key)
  const init = (r: T | undefined | null) =>
    r !== null && r !== undefined && set(r)
  r instanceof Promise ? r.then(init) : init(r)
  return {
    subscribe,
    set: (value) => {
      adapter.write(key, value)
      return set(value)
    },
    update: (updater) => {
      return update((draft) => {
        const value = updater(draft)
        adapter.write(key, value)
        return value
      })
    },
    async getValue() {
      const r = (await adapter.read(key)) ?? initial
      set(r)
      return r
    },
  }
}

export function indexedDBAdapter<T>(options: {
  dbName: string
  storeName: string
}): LocalStoreAdapter<T> {
  return {
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
