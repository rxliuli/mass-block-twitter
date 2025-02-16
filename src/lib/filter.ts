import { MUTED_WORDS_KEY, ParsedTweet } from './api'
import { getSettings } from './settings'
import { matchByKeyword } from './util/matchByKeyword'

export interface TweetFilter {
  name: string
  isSpam: (tweet: ParsedTweet) => boolean
}

export function mutedWordsFilter(): TweetFilter {
  return {
    name: 'mutedWordsFilter',
    isSpam: (tweet: ParsedTweet) => {
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
    isSpam: (tweet: ParsedTweet) => {
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
    isSpam: (tweet: ParsedTweet) => {
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
    isSpam: (tweet: ParsedTweet) => {
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
    isSpam: (tweet: ParsedTweet) => {
      if (spamContext.modlistUsers[tweet.user.id]) {
        return true
      }
      return false
    },
  }
}
