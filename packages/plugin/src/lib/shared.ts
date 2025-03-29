import { get } from 'idb-keyval'
import { spamContext } from './filter'
import { ModListSubscribedUserAndRulesResponse } from '@mass-block-twitter/server'
import { dbApi, Tweet, User } from './db'
import { blockUser } from './api/twitter'
import { ulid } from 'ulidx'
import { defineCustomEventMessage } from './util/CustomEventMessage'

export async function refreshSpamUsers(userIds: string[]): Promise<void> {
  const list = await Promise.all(
    userIds.map(
      async (userId) => [userId, await dbApi.spamUsers.has(userId)] as const,
    ),
  )
  list.forEach(async ([userId, isSpam]) => {
    if (!isSpam) {
      return
    }
    spamContext.spamUsers.add(userId)
    const user = await dbApi.users.get(userId)
    if (!user || user.following || user.blocking) {
      return
    }
    await blockUser(user)
    await dbApi.activitys.record([
      {
        id: ulid().toString(),
        action: 'block',
        trigger_type: 'auto',
        match_type: 'user',
        match_filter: 'sharedSpam',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.id,
        user_name: user.name,
        user_screen_name: user.screen_name,
      },
    ])
    console.log('blockUser', user)
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
}>()
