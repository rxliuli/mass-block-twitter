import { get } from 'idb-keyval'
import map from 'just-map-object'
import { spamContext } from './filter'

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

export async function getModListSubscribedUsers(): Promise<
  Record<string, string>
> {
  return ((await get('modListSubscribedUsers')) ?? {}) as Record<string, string>
}

export async function refershSpamContext() {
  ;[spamContext.spamUsers, spamContext.modlistUsers] = await Promise.all([
    getSpamUsers(),
    getModListSubscribedUsers(),
  ])
}
