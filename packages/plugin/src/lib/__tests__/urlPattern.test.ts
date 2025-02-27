import { URLPattern } from 'urlpattern-polyfill'
import { it, expect } from 'vitest'

it('urlPattern polyfill', () => {
  const pattern = new URLPattern(
    'https://x.com/i/api/graphql/:id/(HomeTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|CommunityTweetsTimeline)',
  )
  expect(
    pattern.test(
      'https://x.com/i/api/graphql/jor5fVC4grHgHsSFWc04Pg/TweetDetail',
    ),
  ).true
})
