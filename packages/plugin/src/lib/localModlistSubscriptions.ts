import { ModListSubscribeRequest } from "@mass-block-twitter/server";
import { get, set, del, entries } from "idb-keyval";

export async function setSubscription(modListId: string, action: ModListSubscribeRequest['action']) {
  await set(`rxliuli:modlist:${modListId}:action`, action);
}

export async function removeSubscription(modListId: string) {
  await del(`rxliuli:modlist:${modListId}:action`);
}

export async function getSubscription(modListId: string): Promise<ModListSubscribeRequest['action'] | null> {
  return await get(`rxliuli:modlist:${modListId}:action`) as ModListSubscribeRequest['action'] | null;
}

export async function getAllSubscriptions(): Promise<Record<string, ModListSubscribeRequest['action']>> {
  const allEntries = await entries();
  const subscriptions = allEntries.reduce((acc, [key, value]) => {
    if (typeof key === 'string' && key.startsWith('rxliuli:modlist:')) {
      const modListId = key.split(':')[2];
      acc[modListId] = value as ModListSubscribeRequest['action'];
    }
    return acc;
  }, {} as Record<string, ModListSubscribeRequest['action']>);
  return subscriptions;
}