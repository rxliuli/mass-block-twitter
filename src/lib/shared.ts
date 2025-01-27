import { get } from 'idb-keyval'
import map from 'just-map-object'

export async function getSpamUsers(): Promise<
  Record<string, 'spam' | 'report'>
> {
  const spamUsers = ((await get('spamUsers')) ?? {}) as Record<string, number>
  return map(spamUsers, (_key, value) => {
    if (value > 10) {
      return 'spam'
    }
    return 'report'
  })
}
