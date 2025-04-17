import { get } from 'idb-keyval'
import { spamContext } from './filter'
import {
  ModListSubscribedUserAndRulesResponse,
  TwitterSpamReportRequest,
} from '@mass-block-twitter/server'
import { dbApi, Tweet, User } from './db'
// don't working
// import { defineCustomEventMessaging } from '@webext-core/messaging/page'
import { defineCustomEventMessage } from './util/CustomEventMessage'

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
}>()
