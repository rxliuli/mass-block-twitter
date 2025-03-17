import { set } from 'idb-keyval'
import { sendMessage } from './messaging'
import {
  AccountSettingsResponse,
  AuthInfo,
  CheckSpamUserRequest,
  CheckSpamUserResponse,
  ModListSubscribedUserAndRulesResponse,
  TwitterSpamReportRequest,
} from '@mass-block-twitter/server'
import { SERVER_URL } from './constants'
import { ModListSubscribedUsersKey } from './shared'
import { crossFetch } from './query'
import { dbApi } from './db'
import { chunk } from 'lodash-es'
import { getSettings } from './settings'

export async function refreshModListSubscribedUsers(
  force?: boolean,
): Promise<void> {
  const token = (
    await browser.storage.local.get<{ authInfo: AuthInfo | null }>('authInfo')
  ).authInfo?.token
  if (!token) {
    return
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }
  if (force) {
    headers['no-cache'] = 'true'
  }
  const resp = await crossFetch(
    `${SERVER_URL}/api/modlists/subscribed/users?version=` +
      browser.runtime.getManifest().version,
    {
      headers,
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

export async function autoCheckPendingUsers() {
  const interval = setInterval(async () => {
    const _pendingUsers = await dbApi.pendingCheckUsers.list()
    // console.log('autoCheckPendingUsers', _pendingUsers)
    if (_pendingUsers.length === 0) {
      return
    }
    const list = chunk(_pendingUsers, 50)
    for (const pendingUsers of list) {
      const resp = await fetch(SERVER_URL + '/api/twitter/spam-users/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pendingUsers satisfies CheckSpamUserRequest),
      })
      if (!resp.ok) {
        return
      }
      const data = (await resp.json()) as CheckSpamUserResponse
      await dbApi.spamUsers.record(
        data.filter((it) => it.isSpamByManualReview).map((it) => it.userId),
      )
      await dbApi.pendingCheckUsers.updateStatus(
        pendingUsers.map((it) => it.user.id),
        'checked',
      )
    }
  }, 1000 * 10)
  return () => clearInterval(interval)
}

export async function spamReport(request: TwitterSpamReportRequest) {
  const resp = await fetch(`${SERVER_URL}/api/twitter/spam-users`, {
    method: 'POST',
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!resp.ok) {
    throw new Error('Failed to report spam' + resp.statusText)
  }
}
