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
import faIR from '../i18n/fa-IR.json'
import { getSettings } from './settings'
import { get, Readable } from 'svelte/store'

export function initI18n(language: string) {
  addMessages('en-US', enUS)
  addMessages('zh-CN', zhCN)
  addMessages('es', es)
  addMessages('fa-IR', faIR)

  init({
    fallbackLocale: 'en-US',
    initialLocale: language,
  })
}

export function setLocale(language: string) {
  locale.set(language)
}

export const t = format
type UnwrapStore<T> = T extends Readable<infer U> ? U : T
export const tP: UnwrapStore<typeof format> = (...args) => get(format)(...args)

const supportLanguages = ['en-US', 'zh-CN', 'es', 'fa-IR']
export function getLocaleLanguage(): 'en-US' | 'zh-CN' | 'es' | 'fa-IR' {
  const settings = getSettings()
  if (settings.language && supportLanguages.includes(settings.language)) {
    return settings.language as 'en-US' | 'zh-CN' | 'es' | 'fa-IR'
  }
  let r = getLocaleFromNavigator()
  if (r && supportLanguages.includes(r)) {
    return r as 'en-US' | 'zh-CN' | 'es' | 'fa-IR'
  }
  r = r?.match(/\b([a-z]{2})\b/)?.[1] || null
  if (r && supportLanguages.map(l => l.split('-')[0]).includes(r)) {
    return supportLanguages.find(l => l.split('-')[0] === r) as 'en-US' | 'zh-CN' | 'es' | 'fa-IR'
  }
  return 'en-US'
}
