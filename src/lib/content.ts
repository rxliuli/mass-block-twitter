import { set } from 'idb-keyval'
import { sendMessage } from './messaging'
import { AccountSettingsResponse, AuthInfo } from '@mass-block-twitter/server'
import { SERVER_URL } from './constants'

export async function refreshSpamUsers(): Promise<void> {
  const spamUsers = await sendMessage('fetchSpamUsers', undefined)
  await set('spamUsers', spamUsers)
}

export async function refreshModListSubscribedUsers(
  force?: boolean,
): Promise<void> {
  try {
    const modListSubscribedUsers = await sendMessage(
      'fetchModListSubscribedUsers',
      force,
    )
    await set('modListSubscribedUsers', modListSubscribedUsers)
    document.dispatchEvent(new Event('RefreshModListSubscribedUsers'))
  } catch (error) {
    if (
      typeof error === 'object' &&
      error &&
      'code' in error &&
      error.code === 401
    ) {
      document.dispatchEvent(new Event('TokenExpired'))
      return
    }
    throw error
  }
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
