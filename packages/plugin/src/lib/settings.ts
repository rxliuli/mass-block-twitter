import { SETTINGS_KEY } from './constants'
import { localStorageAdapter, localStore } from './util/localStore'

export type Settings = {
  theme?: 'system' | 'light' | 'dark'
  language?: 'en-US' | 'zh-CN' | 'es' | 'fa-IR'
  showFloatingButton?: boolean

  hideSuspiciousAccounts: boolean
  hideSpamAccounts: boolean
  hideBlueVerified?: 'none' | 'only-blue' | 'only-non-blue'
  hideMutedWords: boolean
  hideModListAccounts: boolean
  hideLanguages: string[]
  hideAdvertiser?: boolean

  hideGrok?: boolean
  blockSpeedRange?: [number, number]
  devMode?: boolean
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

export function getDefaultSettings(): Settings {
  return {
    hideSuspiciousAccounts: true,
    hideSpamAccounts: true,
    hideMutedWords: true,
    hideModListAccounts: true,
    hideLanguages: [],
    theme: 'system',
    hideAdvertiser: true,
    hideGrok: false,
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
