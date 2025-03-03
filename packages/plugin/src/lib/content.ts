import { set } from 'idb-keyval'
import { sendMessage } from './messaging'
import {
  AccountSettingsResponse,
  AuthInfo,
  ModListSubscribedUserAndRulesResponse,
} from '@mass-block-twitter/server'
import { SERVER_URL } from './constants'
import { ModListSubscribedUsersKey } from './shared'
import { crossFetch } from './query'

export async function refreshSpamUsers(): Promise<void> {
  const spamUsers = await sendMessage('fetchSpamUsers', undefined)
  await set('spamUsers', spamUsers)
}

export async function refreshModListSubscribedUsers(
  force?: boolean,
): Promise<void> {
  const token = (
    await browser.storage.local.get<{ authInfo: AuthInfo | null }>('authInfo')
  ).authInfo?.token
  if (!token) {
    return
  }
  const resp = await crossFetch(
    `${SERVER_URL}/api/modlists/subscribed/users?version=` +
      browser.runtime.getManifest().version,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
      },
    },
  )
  if (!resp.ok) {
    if (resp.status === 401) {
      document.dispatchEvent(new Event('TokenExpired'))
      return
    }
    return
  }
  const modListSubscribedUsers =
    (await resp.json()) as ModListSubscribedUserAndRulesResponse
  await set(ModListSubscribedUsersKey, modListSubscribedUsers)
  document.dispatchEvent(new Event('RefreshModListSubscribedUsers'))
}

export async function refreshAuthInfo() {
  const authInfo = (
    await browser.storage.local.get<{ authInfo: AuthInfo | null }>('authInfo')
  ).authInfo
  if (!authInfo?.token) {
    return
  }
  const resp = await fetch(SERVER_URL + '/api/accounts/settings', {
    headers: {
      Authorization: `Bearer ${authInfo.token}`,
    },
  })
  if (!resp.ok) {
    if (resp.status === 401) {
      await browser.storage.local.remove('authInfo')
      return
    }
    return
  }
  const settings = (await resp.json()) as AccountSettingsResponse
  await browser.storage.local.set({
    authInfo: {
      ...authInfo,
      isPro: settings.isPro,
    } satisfies AuthInfo,
  })
}
