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
import * as localModlistSubscriptions from '$lib/localModlistSubscriptions'
import { getTweetElement } from './observe'
import { ShieldBanIcon, ShieldCheckIcon } from 'lucide-svelte'
import { toast } from 'svelte-sonner'
import { ulid } from 'ulidx'
import {
  blockUser,
  getBlockedUsers,
  getCommunityInfo,
  getCommunityMembers,
  getUserBlueVerifiedFollowers,
  getUserByScreenName,
  getUserFollowers,
  getUserFollowing,
  searchPeople,
  unblockUser,
} from './api/twitter'
import { xClientTransaction } from './api'
import dayjs from 'dayjs'
import { navigate } from './components/logic/router'
import { useOpen } from './stores/open.svelte'

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
    `${SERVER_URL}/api/modlists/subscribed/users`,
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
  const { newToken, ...settings } =
    (await resp.json()) as AccountSettingsResponse
  await browser.storage.local.set({
    authInfo: {
      ...authInfo,
      isPro: settings.isPro,
      token: newToken ?? authInfo.token,
    } satisfies AuthInfo,
  })
}

type ValueType<T extends any[]> = T extends (infer U)[] ? U : never
export async function autoCheckPendingUsers() {
  let isRunning = false
  const interval = setInterval(async () => {
    if (isRunning) {
      return
    }
    isRunning = true
    let spamUsers: (ValueType<CheckSpamUserResponse> & {
      user: User
    })[] = []
    try {
      for await (const pendingUsers of dbApi.pendingCheckUsers.keys()) {
        if (pendingUsers.length === 0) {
          continue
        }
        console.debug('autoCheckPendingUsers', pendingUsers)
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
        spamUsers.push(
          ...data
            .filter((it) => it.isSpamByManualReview)
            .map((spamUser) => ({
              ...spamUser,
              user: pendingUsers.find((it) => it.user.id === spamUser.userId)
                ?.user!,
            }))
            .filter((it) => it.user),
        )
      }
      for (const spamUser of spamUsers.slice(0, 10)) {
        if (spamUser.user.blocking || spamUser.user.following) {
          continue
        }
        await blockUser({ id: spamUser.userId })
        await dbApi.users.block(spamUser.user)
      }
    } finally {
      isRunning = false
    }
  }, 1000 * 10)
  return () => clearInterval(interval)
}

interface Task {
  name: string
  fn: () => Promise<any>
  status: 'idle' | 'running' | 'success' | 'error'
  collapsibled: boolean
  result?: any
  error?: Error
}

export const tasks: Pick<Task, 'name' | 'fn'>[] = [
  {
    name: 'getXTransactionId',
    fn: () =>
      xClientTransaction.generateTransactionId(
        'POST',
        'https://x.com/i/api/1.1/blocks/create.json',
      ),
  },
  {
    name: 'getBlockedUsers',
    fn: () => getBlockedUsers({ count: 10 }),
  },
  {
    name: 'blockUser',
    fn: () => blockUser({ id: '25073877' }),
  },
  {
    name: 'unblockUser',
    fn: () => unblockUser('25073877'),
  },
  {
    name: 'searchPeople',
    fn: () =>
      searchPeople({
        term: 'trump',
        count: 10,
      }),
  },
  {
    name: 'getCommunityInfo',
    fn: () => getCommunityInfo({ communityId: '1900366536683987325' }),
  },
  {
    name: 'getCommunityMembers',
    fn: () => getCommunityMembers({ communityId: '1900366536683987325' }),
  },
  {
    name: 'getUserBlueVerifiedFollowers',
    fn: () => getUserBlueVerifiedFollowers({ userId: '736267842681602048' }),
  },
  {
    name: 'getUserFollowers',
    fn: () => getUserFollowers({ userId: '736267842681602048' }),
  },
  {
    name: 'getUserFollowing',
    fn: () => getUserFollowing({ userId: '736267842681602048' }),
  },
  {
    name: 'getUserByScreenName',
    fn: () => getUserByScreenName('rxliuli'),
  },
]

async function runTasks() {
  const r: Task[] = []
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    try {
      const result = await task.fn()
      r.push({
        name: task.name,
        fn: task.fn,
        status: 'success',
        result,
        collapsibled: true,
      })
    } catch (error) {
      r.push({
        name: task.name,
        fn: task.fn,
        status: 'error',
        error: error as Error,
        collapsibled: true,
      })
    }
  }
  return r
}

export async function autoCheckTwitterAPI() {
  if (!localStorage.getItem('CheckTwitterAPI')) {
    return
  }
  setTimeout(async () => {
    const lastCheck = localStorage.getItem('lastCheckTwitterAPI')
    if (lastCheck) {
      const lastCheckDate = new Date(lastCheck)
      const now = new Date()
      const diff = now.getTime() - lastCheckDate.getTime()
      if (diff < 1000 * 60 * 60 * 24) {
        return
      }
    }
    const r = await runTasks()
    const errorTasks = r.filter((it) => it.status === 'error')
    if (errorTasks.length > 0) {
      console.error('errorTasks', errorTasks)
      toast.error(
        `Failed to check twitter api, ${errorTasks.length} tasks failed`,
        {
          description: errorTasks.map((it) => it.name).join('\n'),
          duration: 100000,
        },
      )
    }
    localStorage.setItem('lastCheckTwitterAPI', new Date().toISOString())
  }, 1000 * 3)
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
    if (!isDismissed) {
      toast.info('User blocked', {
        id: toastId,
        icon: ShieldBanIcon,
        duration: 3000,
        cancel: undefined,
      })
    }
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
  }, 3000)
}

export function autoAlertBlocked() {
  setTimeout(async () => {
    const lastAlert = localStorage.getItem('LAST_ALERT_BLOCKED')
    if (lastAlert) {
      const now = dayjs()
      if (now.diff(dayjs(lastAlert), 'day') === 0) {
        return
      }
    }
    localStorage.setItem('LAST_ALERT_BLOCKED', new Date().toISOString())
    const before = dayjs().subtract(0, 'day')
    const blockedUsers = (
      await dbApi.activitys.getByRange(
        before.startOf('day').toDate(),
        before.endOf('day').toDate(),
      )
    ).sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (blockedUsers.length === 0) {
      return
    }
    toast.info(`${blockedUsers.length} users were blocked yesterday`, {
      duration: 10000,
      description:
        blockedUsers
          .slice(0, 3)
          .map((it) => it.user_name)
          .join(',') +
        (blockedUsers.length > 3 ? ` and ${blockedUsers.length - 3} more` : ''),
      action: {
        label: 'View',
        onClick: () => {
          navigate('/dashboard/activities')
          useOpen().openModal()
        },
      },
    })
  }, 1000 * 10)
}
