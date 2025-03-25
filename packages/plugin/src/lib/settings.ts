import { SETTINGS_KEY } from './constants'
import { localStorageAdapter, localStore } from './util/localStore'

export type Settings = {
  theme?: 'system' | 'light' | 'dark'
  language?: 'en-US' | 'zh-CN' | 'es'
  showFloatingButton?: boolean

  hideSuspiciousAccounts: boolean
  hideSpamAccounts: boolean
  hideBlueVerifiedAccounts: boolean
  hideMutedWords: boolean
  hideModListAccounts: boolean
  hideLanguages: string[]
  blockSpeed?: number
}

function getLocalStorage<T>(key: string, defaultValue: T): T {
  const value = localStorage.getItem(key)
  if (value === null) {
    return defaultValue
  }
  return {
    ...defaultValue,
    ...(JSON.parse(value) as T),
  }
}

export function getSettings(): Settings {
  return getLocalStorage(SETTINGS_KEY, {
    hideSuspiciousAccounts: true,
    hideSpamAccounts: true,
    hideMutedWords: true,
    hideModListAccounts: true,
    hideBlueVerifiedAccounts: false,
    hideLanguages: [],
    theme: 'system',
  } as Settings)
}

export function useSettings() {
  return localStore<Settings>(SETTINGS_KEY, getSettings, localStorageAdapter())
}
