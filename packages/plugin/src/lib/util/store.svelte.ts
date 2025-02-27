import { LocalStoreAdapter } from './localStore'

export function _localStore<T>(
  key: string,
  initial: T | ((value?: T) => T),
  adapter: LocalStoreAdapter<T>,
) {
  const s1 = $state({
    value: typeof initial === 'function' ? (initial as any)() : initial,
  })
  const set = (v: T) => {
    s1.value = v
  }
  const r = adapter.read(key)
  const init = (r: T | undefined | null) =>
    r !== null && r !== undefined && set(r)
  r instanceof Promise ? r.then(init) : init(r)
  return {
    get value() {
      return s1.value
    },
    set value(v: T) {
      set(v)
      adapter.write(key, v)
    },
  }
}

export {
  localStorageAdapter,
  indexedDBAdapter,
  browserStorageAdapter,
} from './localStore'
