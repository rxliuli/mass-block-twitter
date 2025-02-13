import { createMutation, createQuery } from '@tanstack/svelte-query'

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

export function useAuthInfo() {
  return createQuery({
    queryKey: ['authInfo'],
    queryFn: getAuthInfo,
  })
}

export function useLogout() {
  return createMutation({
    mutationFn: async () => {
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/auth/logout',
        {
          method: 'POST',
          headers: { Authorization: (await getAuthInfo())?.token! },
        },
      )
      if (!resp.ok) {
        throw new Error('Failed to logout')
      }
      clearAuthInfo()
      location.reload()
    },
  })
}
