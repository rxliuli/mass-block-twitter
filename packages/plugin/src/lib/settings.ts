import { SETTINGS_KEY } from './constants'

export type Settings = {
  theme?: 'system' | 'light' | 'dark'
  hideSuspiciousAccounts: boolean
  hideSpamAccounts: boolean
  hideBlueVerifiedAccounts: boolean
  hideMutedWords: boolean
  hideModListAccounts: boolean
  hideLanguages: string[]
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
