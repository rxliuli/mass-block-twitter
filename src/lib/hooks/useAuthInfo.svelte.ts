import type { AuthInfo } from '@mass-block-twitter/server'

let initialized = false
const state = $state<{
  value: AuthInfo | null
}>({
  value: null,
})
async function getValue() {
  const res =
    (await browser.storage.local.get<{ authInfo: AuthInfo | null }>('authInfo'))
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
        browser.storage.local.remove('authInfo')
      } else {
        browser.storage.local.set({ authInfo: value })
      }
      state.value = value
    },
    getValue,
  }
}

export { getValue as getAuthInfo }
