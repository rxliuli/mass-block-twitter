import { get, set, createStore, del, clear, keys } from 'idb-keyval'

interface SetOptions {
  expirationTtl?: number // living seconds
}

export interface KeyValItem {
  value: any
  createdAt?: number // ms timestamp
  expirationTtl?: number // living seconds
}

interface KeyVal {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, options?: SetOptions): Promise<void>
  del<T>(key: string): Promise<void>
  clear(): Promise<void>
  keys(): Promise<string[]>
}

interface CreateKeyValOptions {
  dbName: string
  storeName: string
  expirationTtl?: number // living seconds
}

export function createKeyVal(config: CreateKeyValOptions): KeyVal {
  const store = createStore(config.dbName, config.storeName)
  async function _get(key: string) {
    const item = (await get(key, store)) as KeyValItem | null
    if (!item) {
      return null
    }
    const ttl = item?.expirationTtl ?? config.expirationTtl
    if (!ttl || !item.createdAt) {
      return item.value
    }
    const now = Date.now()
    if (now >= item.createdAt + ttl * 1000) {
      await del(key, store)
      return null
    }
    return item.value
  }
  return {
    get: _get,
    set: async (key: string, value: any, options?: SetOptions) => {
      await set(
        key,
        {
          value,
          createdAt: Date.now(),
          expirationTtl: options?.expirationTtl,
        } satisfies KeyValItem,
        store,
      )
    },
    del: async (key: string) => {
      await del(key, store)
    },
    clear: async () => {
      await clear(store)
    },
    keys: async () => {
      const list = (await keys(store)) as string[]
      return (
        await Promise.all(
          list.map(async (it) => {
            const item = await _get(it)
            if (!item) {
              return null
            }
            return it
          }),
        )
      ).filter((it) => it !== null)
    },
  }
}
