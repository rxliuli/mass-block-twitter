import { ModListSubscribeRequest } from "@mass-block-twitter/server";



export async function setSubscription(modListId: string, action: ModListSubscribeRequest['action']) {
  localStorage.setItem(`rxliuli:modlist:${modListId}:action`, action)
}
export async function removeSubscription(modListId: string) {
  localStorage.removeItem(`rxliuli:modlist:${modListId}:action`)
}

export async function getSubscription(modListId: string): Promise<ModListSubscribeRequest['action'] | null> {
  return localStorage.getItem(`rxliuli:modlist:${modListId}:action`) as ModListSubscribeRequest['action'] | null
}

export async function getAllSubscriptions(): Promise<Record<string, ModListSubscribeRequest['action']>> {
  const keys = Object.keys(localStorage)
  const modListIds = keys.filter((key) => key.startsWith('rxliuli:modlist:'))
  const subscriptions = modListIds.reduce((acc, key) => {
    const modListId = key.split(':')[2]
    const action = localStorage.getItem(key) as ModListSubscribeRequest['action']
    acc[modListId] = action
    return acc
  }, {} as Record<string, ModListSubscribeRequest['action']>)
  return subscriptions
}