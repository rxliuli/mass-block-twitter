import { MUTED_WORDS_KEY, ParsedTweet } from './api'
import { User } from './db'
import { extractCurrentUserId } from './observe'
import { getSettings } from './settings'
import { matchByKeyword } from './util/matchByKeyword'

type FilterResult = 'show' | 'hide' | 'next'
type FilterData =
  | { type: 'tweet'; tweet: ParsedTweet }
  | { type: 'user'; user: User }
export interface TweetFilter {
  name: string
  tweetCondition?: (tweet: ParsedTweet) => FilterResult
  userCondition?: (user: User) => FilterResult
}

export function flowFilter(
  filters: TweetFilter[],
): (options: FilterData) => { value: boolean; reason?: string } {
  return (data) => {
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
        return {
          value: false,
          reason: filter.name,
        }
      }
    }
    return {
      value: true,
    }
  }
}

export function verifiedFilter(): TweetFilter {
  const currentUserId = extractCurrentUserId()
  return {
    name: 'verifiedFilter',
    userCondition: (user: User) => {
      if (user.following || user.id === currentUserId) {
        return 'show'
      }
      return 'next'
    },
  }
}

export function mutedWordsFilter(): TweetFilter {
  function filterByTexts(texts: (string | undefined)[]): FilterResult {
    const keywordStr = localStorage.getItem(MUTED_WORDS_KEY)
    if (!keywordStr) {
      return 'next'
    }
    const keywords = JSON.parse(keywordStr) as string[]
    if (keywords.length === 0) {
      return 'next'
    }
    if (
      keywords.some((keyword) =>
        texts.some((text) => matchByKeyword(keyword, [text])),
      )
    ) {
      return 'hide'
    }
    return 'next'
  }
  return {
    name: 'mutedWordsFilter',
    tweetCondition: (tweet: ParsedTweet) =>
      filterByTexts([
        tweet.user.screen_name,
        tweet.user.name,
        tweet.user.description,
        tweet.text,
      ]),
    userCondition: (user: User) =>
      filterByTexts([user.screen_name, user.name, user.description]),
  }
}

export function defaultProfileFilter(): TweetFilter {
  return {
    name: 'defaultProfileFilter',
    userCondition: (user: User) => {
      if (
        ((typeof user.default_profile === 'boolean' && user.default_profile) ||
          !user.description ||
          (typeof user.default_profile_image === 'boolean' &&
            user.default_profile_image)) &&
        user.followers_count === 0
      ) {
        return 'hide'
      }
      return 'next'
    },
  }
}

export function blueVerifiedFilter(): TweetFilter {
  return {
    name: 'blueVerifiedFilter',
    userCondition: (user: User) => {
      if (user.is_blue_verified) {
        return 'hide'
      }
      return 'next'
    },
  }
}
export let spamContext: {
  spamUsers: Record<string, 'spam' | 'report'>
  // key is twitter user id, value is modlist id
  modlistUsers: Record<string, string>
} = {
  spamUsers: {},
  modlistUsers: {},
}

export function sharedSpamFilter(): TweetFilter {
  return {
    name: 'sharedSpamFilter',
    userCondition: (user: User) => {
      if (spamContext.spamUsers[user.id] === 'spam') {
        return 'hide'
      }
      return 'next'
    },
  }
}

export function modListFilter(): TweetFilter {
  return {
    name: 'modListFilter',
    userCondition: (user: User) => {
      if (spamContext.modlistUsers[user.id]) {
        return 'hide'
      }
      return 'next'
    },
  }
}

export function languageFilter(languages: string[]): TweetFilter {
  return {
    name: 'languageFilter',
    tweetCondition: (tweet: ParsedTweet) => {
      if (languages.includes(tweet.lang)) {
        return 'hide'
      }
      return 'next'
    },
  }
}
