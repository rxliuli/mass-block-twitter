import { get } from 'idb-keyval'
import map from 'just-map-object'
import { spamContext } from './filter'
import { ModListSubscribedUserAndRulesResponse } from '@mass-block-twitter/server'

export async function getSpamUsers(): Promise<
  Record<string, 'spam' | 'report'>
> {
  const spamUsers = ((await get('spamUsers')) ?? {}) as Record<string, number>
  return map(spamUsers, (_key, value) => {
    if (typeof value === 'string') {
      return value
    }
    if (value > 10) {
      return 'spam'
    }
    return 'report'
  })
}

export const ModListSubscribedUsersKey =
  'MassBlockTwitterModListSubscribedUsers'

export async function getSubscribedModLists(): Promise<ModListSubscribedUserAndRulesResponse> {
  return ((await get(ModListSubscribedUsersKey)) ??
    []) as ModListSubscribedUserAndRulesResponse
}

export async function refershSpamContext() {
  ;[spamContext.spamUsers, spamContext.modlists] = await Promise.all([
    getSpamUsers(),
    getSubscribedModLists(),
  ])
}
