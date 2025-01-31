import { SETTINGS_KEY } from './constants'

export type Settings = {
  hideSuspiciousAccounts: boolean
  hideSpamAccounts: boolean
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
  } as Settings)
}
