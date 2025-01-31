import { ParsedTweet } from '$lib/api'
import { defaultProfileFilter } from '$lib/filter'
import { beforeEach, describe, expect, it } from 'vitest'

describe('defaultProfileFilter', () => {
  let tweet: ParsedTweet
  beforeEach(() => {
    tweet = {
      id: '1885207553963155664',
      text: '@Cldeop 蓝V代🍂开，刷推特粉丝🌈，卖推特号',
      created_at: '2025-01-31T06:04:40.000Z',
      user: {
        id: '1866039122118443008',
        blocking: false,
        following: false,
        screen_name: 'brentzgtp18293',
        name: 'Brentzgtp',
        description: '',
        profile_image_url:
          'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
        created_at: '2024-12-09T08:36:12.000Z',
        updated_at: '2025-01-31T07:19:26.136Z',
        followers_count: 0,
        default_profile: true,
        default_profile_image: true,
      },
    }
  })
  it('should return true', () => {
    expect(defaultProfileFilter(tweet)).true
  })
  it('should return false', () => {
    tweet.user.followers_count = 1
    expect(defaultProfileFilter(tweet)).false
  })
})
