import {
  addMessages,
  init,
  format,
  getLocaleFromNavigator,
  locale,
} from 'svelte-i18n'
import enUS from '../i18n/en-US.json'
import zhCN from '../i18n/zh-CN.json'
import { get } from 'svelte/store'

export function initI18n(language: string) {
  addMessages('en-US', enUS)
  addMessages('zh-CN', zhCN)

  init({
    fallbackLocale: 'en-US',
    initialLocale: language,
  })
}

export function setLocale(language: string) {
  locale.set(language)
}

export const t = format

export function getLocaleLanguage(): 'en-US' | 'zh-CN' {
  const r = getLocaleFromNavigator()
  if (r && ['en-US', 'zh-CN'].includes(r)) {
    return r as 'en-US' | 'zh-CN'
  }
  return 'en-US'
}
