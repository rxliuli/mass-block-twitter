import { ulid } from 'ulidx'
import {
  MUTED_WORD_RULES_KEY,
  MUTED_WORDS_KEY,
  ParsedTweet,
  parseSourceType,
} from './api'
import { User } from './db'
import { extractCurrentUserId } from './observe'
import { matchByKeyword } from './util/matchByKeyword'
import { pick } from 'es-toolkit'
import { ModListSubscribedUserAndRulesResponse } from '@mass-block-twitter/server'
import { matchRule, Rule, RuleData } from './rule'
import { Lru } from 'toad-cache'
import { memoize, MemoizeCache } from 'es-toolkit'
import { tweet } from 'node_modules/@mass-block-twitter/server/src/db/schema'

export type FilterResult = 'show' | 'hide' | 'next' | 'block'
export type FilterData =
  | { type: 'tweet'; tweet: ParsedTweet }
  | { type: 'user'; user: User }

export interface TweetFilter {
  name: string
  tweetCondition?: (tweet: ParsedTweet) => FilterResult
  userCondition?: (user: User) => FilterResult
}

export const flowFilterCacheMap = new Lru<{ value: boolean; reason?: string }>(
  1000,
)

export function flowFilter(
  filters: TweetFilter[],
  onAction?: (
    filterData: FilterData,
    result: Extract<FilterResult, 'hide' | 'block'>,
    filterName: TweetFilter['name'],
  ) => void,
): (options: FilterData) => { value: boolean; reason?: string } {
  return memoize(
    (data): { value: boolean; reason?: string } => {
      for (const filter of filters) {
        let result: FilterResult = 'next'
        if (data.type === 'tweet') {
          if (filter.tweetCondition) {
            result = filter.tweetCondition(data.tweet)
          } else if (filter.userCondition) {
            result = filter.userCondition(data.tweet.user)
          }
        } else {
          if (filter.userCondition) {
            result = filter.userCondition(data.user)
          }
        }
        if (result === 'show') {
          return {
            value: true,
            reason: filter.name,
          }
        }
        if (result === 'hide') {
          onAction?.(data, 'hide', filter.name)
          return {
            value: false,
            reason: filter.name,
          }
        }
        if (result === 'block') {
          onAction?.(data, 'block', filter.name)
          return {
            value: false,
            reason: filter.name,
          }
        }
      }
      return {
        value: true,
      }
    },
    {
      getCacheKey: (data) => {
        return data.type === 'tweet'
          ? 'tweet:' + data.tweet.id
          : 'user:' + data.user.id
      },
      cache: {
        get: (key) => flowFilterCacheMap.get(key),
        set: (key, value) => flowFilterCacheMap.set(key, value),
        has: (key) => flowFilterCacheMap.get(key) !== undefined,
      } as MemoizeCache<string, { value: boolean; reason?: string }>,
    },
  )
}

export function selfFilter(): TweetFilter {
  const currentUserId = extractCurrentUserId()
  return {
    name: 'self',
    userCondition: (user: User) => {
      if (user.following || user.id === currentUserId) {
        return 'show'
      }
      return 'next'
    },
  }
}

export interface MutedWordRule {
  id: string
  keyword: string
  type: Extract<FilterResult, 'hide' | 'block'>
  checkpoints: ('name' | 'screen_name' | 'description' | 'location' | 'tweet')[]
}

export function getMutedWordRules(): MutedWordRule[] {
  const value = localStorage.getItem(MUTED_WORD_RULES_KEY)
  if (value) {
    return JSON.parse(value)
  }
  const keywords = localStorage.getItem(MUTED_WORDS_KEY)
  if (keywords) {
    return JSON.parse(keywords).map(
      (it: string) =>
        ({
          id: ulid(),
          keyword: it,
          type: 'hide',
          checkpoints: [
            'name',
            'screen_name',
            'description',
            'location',
            'tweet',
          ],
        } satisfies MutedWordRule),
    )
  }
  return []
}

export function mutedWordsFilter(): TweetFilter {
  const rules = getMutedWordRules()
  function filter(
    user: Pick<User, 'name' | 'screen_name' | 'description' | 'location'> & {
      tweet?: string
    },
  ) {
    if (rules.length === 0) {
      return 'next'
    }
    const rule = rules.find((rule) => {
      const texts = Object.values(pick(user, rule.checkpoints)) as (
        | string
        | undefined
      )[]
      if (matchByKeyword(rule.keyword, texts)) {
        return true
      }
      return false
    })
    if (rule) {
      return rule.type
    }
    return 'next'
  }
  return {
    name: 'mutedWords',
    tweetCondition: (tweet: ParsedTweet) =>
      filter({
        ...tweet.user,
        tweet: tweet.text,
      }),
    userCondition: filter,
  }
}

export function defaultProfileFilter(): TweetFilter {
  return {
    name: 'defaultProfile',
    userCondition: (user: User) => {
      let score = 0
      if (
        !user.description &&
        typeof user.default_profile === 'boolean' &&
        user.default_profile
      ) {
        score += 1
      }
      if (
        !user.profile_image_url &&
        typeof user.default_profile_image === 'boolean' &&
        user.default_profile_image
      ) {
        score += 1
      }
      if (user.followers_count === 0) {
        score += 1
        if (user.friends_count === 0) {
          score += 1
        }
      }
      if (score >= 2) {
        return 'hide'
      }
      return 'next'
    },
  }
}

export function blueVerifiedFilter(): TweetFilter {
  return {
    name: 'blueVerified',
    userCondition: (user: User) => {
      if (user.is_blue_verified) {
        return 'hide'
      }
      return 'next'
    },
  }
}
export let spamContext: {
  spamUsers: Set<string>
  modlists: ModListSubscribedUserAndRulesResponse
} = {
  spamUsers: new Set(),
  modlists: [],
}

export function sharedSpamFilter(): TweetFilter {
  return {
    name: 'sharedSpam',
    userCondition: (user: User) => {
      if (spamContext.spamUsers.has(user.id)) {
        return 'block'
      }
      return 'next'
    },
  }
}

export function modListFilter(): TweetFilter {
  function f(data: RuleData) {
    for (const modlist of spamContext.modlists) {
      // TODO: tweets parse error TypeError: Cannot read properties of undefined (reading 'includes')
      if (data.user && modlist.twitterUserIds?.includes(data.user.id)) {
        if (modlist.action === 'block') {
          return 'block'
        } else {
          return 'hide'
        }
      }
      if (matchRule(modlist.rules as Rule[], data)) {
        if (modlist.action === 'block') {
          return 'block'
        } else {
          return 'hide'
        }
      }
    }
    return 'next'
  }
  return {
    name: 'modList',
    tweetCondition(tweet) {
      return f({
        tweet,
        user: tweet.user,
      })
    },
    userCondition: (user) => f({ user }),
  }
}

export function languageFilter(languages: string[]): TweetFilter {
  return {
    name: 'language',
    tweetCondition: (tweet: ParsedTweet) => {
      if (languages.includes(tweet.lang)) {
        return 'hide'
      }
      return 'next'
    },
  }
}

export function grokFilter(): TweetFilter {
  return {
    name: 'grok',
    tweetCondition: (tweet: ParsedTweet) => {
      if (tweet.text.toLowerCase().includes('@grok')) {
        return 'hide'
      }
      if (tweet.user.screen_name === 'grok') {
        return 'hide'
      }
      return 'next'
    },
  }
}

export function adFilter(): TweetFilter {
  return {
    name: 'ad',
    tweetCondition: (tweet: ParsedTweet) => {
      if (tweet.is_ad) {
        return 'hide'
      }
      return 'next'
    },
  }
}
