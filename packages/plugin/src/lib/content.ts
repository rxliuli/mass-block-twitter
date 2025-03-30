import { set } from 'idb-keyval'
import {
  AccountSettingsResponse,
  AuthInfo,
  CheckSpamUserRequest,
  CheckSpamUserResponse,
  ModListSubscribedUserAndRulesResponse,
  TwitterSpamReportRequest,
  ModListIdsResponse,
} from '@mass-block-twitter/server'
import { SERVER_URL } from './constants'
import { ModListSubscribedUsersKey } from './shared'
import { crossFetch } from './query'
import { dbApi, Tweet, User } from './db'
import { chunk } from 'es-toolkit'
import * as localModlistSubscriptions from '$lib/localModlistSubscriptions'
import { getTweetElement } from './observe'
import { ShieldBanIcon, ShieldCheckIcon } from 'lucide-svelte'
import { toast } from 'svelte-sonner'
import { ulid } from 'ulidx'
import { blockUser } from './api/twitter'

export async function refreshModListSubscribedUsers(
  force?: boolean,
): Promise<void> {
  const token = (
    await browser.storage.local.get<{ authInfo: AuthInfo | null }>('authInfo')
  ).authInfo?.token
  if (!token) {
    const subscriptions = await localModlistSubscriptions.getAllSubscriptions()
    // TODO: implement fetching rules, currently only twitterUserIds
    const modlistPromises = Object.entries(subscriptions).map(
      async ([modListId, action]) => {
        const resp = await crossFetch(
          `${SERVER_URL}/api/modlists/ids/${modListId}`,
        )
        if (!resp.ok) {
          return {
            modListId,
            action,
            twitterUserIds: [],
            rules: [],
          }
        }
        const data = (await resp.json()) as ModListIdsResponse
        return {
          modListId,
          action,
          twitterUserIds: data.twitterUserIds,
          rules: [],
        }
      },
    )
    const modlistData = await Promise.all(modlistPromises)
    await set(ModListSubscribedUsersKey, modlistData)
    return
  }
  const init: RequestInit = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
  if (force) {
    init.cache = 'no-cache'
  }
  const resp = await crossFetch(
    `${SERVER_URL}/api/modlists/subscribed/users?version=` +
      browser.runtime.getManifest().version,
    init,
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
        await dbApi.pendingCheckUsers.uploaded(
          pendingUsers.map((it) => it.user.id),
          60 * 60 * 1, // 1 hour
        )
        return
      }
      const data = (await resp.json()) as CheckSpamUserResponse
      await dbApi.pendingCheckUsers.uploaded(
        pendingUsers.map((it) => it.user.id),
      )
      await dbApi.spamUsers.record(
        data.filter((it) => it.isSpamByManualReview).map((it) => it.userId),
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

export function quickBlock(options: {
  user: User
  tweet: Tweet
  blockUser?: (user: User) => Promise<void>
}) {
  const { user, tweet } = options
  const tweetElement = getTweetElement(tweet.id)
  if (tweetElement) {
    tweetElement.style.display = 'none'
  }
  let isDismissed = false
  const toastId = toast.info('User blocked', {
    duration: 6000,
    icon: ShieldBanIcon,
    cancel: {
      label: 'Undo',
      onClick: async () => {
        if (tweetElement) {
          tweetElement.style.display = 'block'
        }
        toast.info('Block undone.', {
          id: toastId,
          icon: ShieldCheckIcon,
          duration: 3000,
          cancel: undefined,
        })
        clearTimeout(timer)
      },
    },
    onDismiss: () => {
      isDismissed = true
    },
  })
  const timer = setTimeout(async () => {
    if (options.blockUser) {
      await options.blockUser(user)
    } else {
      await blockUser({ id: user.id })
    }
    await dbApi.activitys.record([
      {
        id: ulid(),
        action: 'block',
        trigger_type: 'manual',
        match_filter: 'batchSelected',
        match_type: 'tweet',
        tweet_id: tweet.id,
        tweet_content: tweet.text,
        user_id: user.id,
        user_name: user.name,
        user_screen_name: user.screen_name,
        user_profile_image_url: user.profile_image_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    if (!isDismissed) {
      toast.info('User blocked', {
        id: toastId,
        icon: ShieldBanIcon,
        duration: 3000,
      })
    }
  }, 3000)
}
