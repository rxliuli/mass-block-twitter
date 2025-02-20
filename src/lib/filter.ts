import { MUTED_WORDS_KEY, ParsedTweet } from './api'
import { extractCurrentUserId } from './observe'
import { getSettings } from './settings'
import { matchByKeyword } from './util/matchByKeyword'

type FilterResult =
  | 'show'
  | 'hide'
  | 'next'
  | true // alias hide
  | false // alias next

export interface TweetFilter {
  name: string
  condition: (tweet: ParsedTweet) => FilterResult
}

export function flowFilter(
  filters: TweetFilter[],
): (tweet: ParsedTweet) => boolean {
  return (tweet: ParsedTweet) => {
    for (const filter of filters) {
      const result = filter.condition(tweet)
      if (result === 'show') {
        return true
      }
      if (result === 'hide' || result === true) {
        return false
      }
    }
    return true
  }
}

export function verifiedFilter(): TweetFilter {
  const currentUserId = extractCurrentUserId()
  return {
    name: 'verifiedFilter',
    condition: (tweet: ParsedTweet) => {
      if (tweet.user.following || tweet.user.id === currentUserId) {
        return 'show'
      }
      return 'next'
    },
  }
}

export function mutedWordsFilter(): TweetFilter {
  return {
    name: 'mutedWordsFilter',
    condition: (tweet: ParsedTweet) => {
      const keywordStr = localStorage.getItem(MUTED_WORDS_KEY)
      if (!keywordStr) {
        return false
      }
      const keywords = JSON.parse(keywordStr) as string[]
      if (keywords.length === 0) {
        return false
      }
      return keywords.some((keyword) =>
        matchByKeyword(keyword, [
          tweet.user.screen_name,
          tweet.user.name,
          tweet.user.description,
          tweet.text,
        ]),
      )
    },
  }
}

export function defaultProfileFilter(): TweetFilter {
  return {
    name: 'defaultProfileFilter',
    condition: (tweet: ParsedTweet) => {
      if (
        ((typeof tweet.user.default_profile === 'boolean' &&
          tweet.user.default_profile) ||
          !tweet.user.description ||
          (typeof tweet.user.default_profile_image === 'boolean' &&
            tweet.user.default_profile_image)) &&
        tweet.user.followers_count === 0
      ) {
        return true
      }
      return false
    },
  }
}

export function blueVerifiedFilter(): TweetFilter {
  return {
    name: 'blueVerifiedFilter',
    condition: (tweet: ParsedTweet) => {
      return !!tweet.user.is_blue_verified
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
    condition: (tweet: ParsedTweet) => {
      if (spamContext.spamUsers[tweet.user.id] === 'spam') {
        return true
      }
      return false
    },
  }
}

export function modListFilter(): TweetFilter {
  return {
    name: 'modListFilter',
    condition: (tweet: ParsedTweet) => {
      if (spamContext.modlistUsers[tweet.user.id]) {
        return true
      }
      return false
    },
  }
}

export function languageFilter(languages: string[]): TweetFilter {
  return {
    name: 'languageFilter',
    condition: (tweet: ParsedTweet) => {
      // console.log('languageFilter', tweet.lang, tweet)
      if (languages.length === 0) {
        return false
      }
      return languages.includes(tweet.lang)
    },
  }
}
