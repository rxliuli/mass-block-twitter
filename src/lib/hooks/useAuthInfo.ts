import { browserStorageAdapter, localStore } from '$lib/util/localStore'
import type { AuthInfo } from '@mass-block-twitter/server'

export function useAuthInfo() {
  return localStore<AuthInfo | null>('authInfo', null, browserStorageAdapter())
}

export async function getAuthInfo() {
  return await useAuthInfo().getValue()
}
