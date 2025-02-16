import { set } from 'idb-keyval'
import { sendMessage } from './messaging'

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
