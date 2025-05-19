import { createMutation } from '@tanstack/svelte-query'
import { onMount } from 'svelte'

export interface AuthInfo {
  id: string
  email: string
  token: string
  isPro: boolean
}

export const userState = $state({
  authInfo: undefined as AuthInfo | undefined,
})

const authInfoKey = 'authInfo'

export async function getAuthInfo(): Promise<AuthInfo | null> {
  const loggedInStr = await localStorage.getItem(authInfoKey)
  if (!loggedInStr) {
    return null
  }
  userState.authInfo = JSON.parse(loggedInStr)
  return userState.authInfo ?? null
}

export async function setAuthInfo(info: AuthInfo) {
  await localStorage.setItem(authInfoKey, JSON.stringify(info))
  userState.authInfo = info
}

export function clearAuthInfo() {
  localStorage.removeItem(authInfoKey)
  userState.authInfo = undefined
}

let initialized = false
export function useAuthInfo(): Partial<AuthInfo> {
  onMount(async () => {
    if (initialized) {
      return
    }
    initialized = true
    await getAuthInfo()
    if (userState.authInfo?.token) {
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/accounts/settings',
        {
          headers: { Authorization: `Bearer ${userState.authInfo.token}` },
        },
      )
      if (!resp.ok) {
        clearAuthInfo()
        return
      }
      const data = await resp.json()
      userState.authInfo = {
        ...userState.authInfo,
        ...data,
      }
    }
  })
  return {
    get id() {
      return userState.authInfo?.id
    },
    get email() {
      return userState.authInfo?.email
    },
    get token() {
      return userState.authInfo?.token
    },
    get isPro() {
      return userState.authInfo?.isPro
    },
  }
}

export function onPluginLoggedIn(authInfo: AuthInfo) {
  document.dispatchEvent(
    new CustomEvent('LoginSuccess', {
      detail: authInfo,
    }),
  )
  setTimeout(() => {
    console.log('onPluginLoggedIn and close window')
    window.close()
  }, 1000)
}
