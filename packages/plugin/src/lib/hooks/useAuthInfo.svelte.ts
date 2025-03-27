import type { AuthInfo } from '@mass-block-twitter/server'

let initialized = false

function getStorage(): Pick<
  typeof browser.storage.local,
  'get' | 'set' | 'remove'
> {
  if (typeof browser === 'undefined') {
    return {
      get: async (key) => {
        return {
          [key as string]: JSON.parse(
            localStorage.getItem(key as string) ?? 'null',
          ),
        }
      },
      set: async (obj) => {
        Object.entries(obj).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value))
        })
      },
      remove: async (key) =>
        Array.isArray(key)
          ? key.forEach((k) => localStorage.removeItem(k as string))
          : localStorage.removeItem(key as string),
    }
  }
  return browser.storage.local
}

const state = $state<{
  value: AuthInfo | null
}>({
  value: null,
})
async function getValue() {
  const res =
    (await getStorage().get<{ authInfo: AuthInfo | null }>('authInfo'))
      .authInfo ?? null
  state.value = res
  return res
}

export function useAuthInfo() {
  if (!initialized) {
    initialized = true
    getValue()
  }
  return {
    get value() {
      return state.value
    },
    set value(value: AuthInfo | null) {
      if (value === null) {
        getStorage().remove('authInfo')
      } else {
        getStorage().set({ authInfo: value })
      }
      state.value = value
    },
    getValue,
  }
}

export { getValue as getAuthInfo }
