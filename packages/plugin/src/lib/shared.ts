import { get } from 'idb-keyval'
import {
  ModListSubscribedUserAndRulesResponse,
  TwitterSpamReportRequest,
} from '@mass-block-twitter/server'
import { dbApi, Tweet, User } from './db'
// don't working
// import { defineCustomEventMessaging } from '@webext-core/messaging/page'
import { defineCustomEventMessage } from './util/CustomEventMessage'
import { ExternalToast } from 'svelte-sonner'
import { Lru } from 'toad-cache'

export const flowFilterCacheMap = new Lru<{ value: boolean; reason?: string }>(
  1000,
)

export const spamContext: {
  spamUsers: Set<string>
  modlists: ModListSubscribedUserAndRulesResponse
  // Hide tweets that are referenced by other hidden tweets
} = {
  spamUsers: new Set(),
  modlists: [],
}

export async function refreshSpamUsers(userIds: string[]): Promise<void> {
  const spamUserIds = await dbApi.spamUsers.isSpam(userIds)
  spamUserIds.forEach((userId) => {
    spamContext.spamUsers.add(userId)
  })
}

export const ModListSubscribedUsersKey =
  'MassBlockTwitterModListSubscribedUsers'

export async function refreshSubscribedModLists(): Promise<void> {
  spamContext.modlists = ((await get(ModListSubscribedUsersKey)) ??
    []) as ModListSubscribedUserAndRulesResponse
}

export const eventMessage = defineCustomEventMessage<{
  QuickBlock: (data: { user: User; tweet: Tweet }) => void
  SpamReportRequest: (data: TwitterSpamReportRequest) => void
  Toast: (data: {
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    options?: ExternalToast
  }) => void

  showBlockUserToast: (user: Pick<User, 'name' | 'screen_name'>) => void
}>()
