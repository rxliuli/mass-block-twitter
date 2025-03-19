import {
  addMessages,
  init,
  format,
  getLocaleFromNavigator,
  locale,
} from 'svelte-i18n'
import enUS from '../i18n/en-US.json'
import zhCN from '../i18n/zh-CN.json'
import es from '../i18n/es.json'
import { getSettings } from './settings'

export function initI18n(language: string) {
  addMessages('en-US', enUS)
  addMessages('zh-CN', zhCN)
  addMessages('es', es)

  init({
    fallbackLocale: 'en-US',
    initialLocale: language,
  })
}

export function setLocale(language: string) {
  locale.set(language)
}

export const t = format

export function getLocaleLanguage(): 'en-US' | 'zh-CN' | 'es' {
  const settings = getSettings()
  if (
    settings.language &&
    ['en-US', 'zh-CN', 'es'].includes(settings.language)
  ) {
    return settings.language as 'en-US' | 'zh-CN' | 'es'
  }
  const r = getLocaleFromNavigator()
  if (r && ['en-US', 'zh-CN', 'es'].includes(r)) {
    return r as 'en-US' | 'zh-CN' | 'es'
  }
  return 'en-US'
}
