import { MUTED_WORDS_KEY, ParsedTweet } from './api'
import { matchByKeyword } from './util/matchByKeyword'

export function mutedWordsFilter(tweet: ParsedTweet) {
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
}

export function defaultProfileFilter(tweet: ParsedTweet) {
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
}

export let spamContext: {
  spamUsers: Record<string, 'spam' | 'report'>
} = {
  spamUsers: {},
}

export function sharedSpamFilter(tweet: ParsedTweet) {
  if (spamContext.spamUsers[tweet.user.id] === 'spam') {
    return true
  }
  return false
}
