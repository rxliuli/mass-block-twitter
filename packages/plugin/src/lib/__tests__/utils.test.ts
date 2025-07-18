// @vitest-environment happy-dom
import { extractObjects } from '$lib/util/extractObjects'
import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import timeline from './assets/timeline.json'
import { z } from 'zod'
import {
  filterNotifications,
  filterTweets,
  MUTED_WORD_RULES_KEY,
  notifacationUserSchema,
  ParsedTweet,
  parseProfileImageUrl,
  parseTweets,
  parseUserRecords,
  timelineUserSchema,
} from '../api'
import allSpam from './assets/all-spam.json'
import { omit, pick } from 'es-toolkit'
import notificationsSpam from './assets/notifications-spam.json'
import profile from './assets/ProfileSpotlightsQuery.json'
import HomeTimeline from './assets/HomeTimeline.json'
import TweetDetail from './assets/TweetDetail.json'
import TweetDetail2 from './assets/TweetDetail2.json'
import TweetDetail3 from './assets/TweetDetail3.json'
import TweetDetail4 from './assets/TweetDetail4.json'
import TweetDetail5 from './assets/TweetDetail5.json'
import TweetDetail6 from './assets/TweetDetail6.json'
import TweetDetail7 from './assets/TweetDetail7.json'
import TweetDetail9 from './assets/TweetDetail9.json'
import TweetDetail10 from './assets/TweetDetail10.json'
import UserTweetsAndReplies from './assets/UserTweetsAndReplies.json'
import UserTweets from './assets/UserTweets.json'
import SearchTimeline from './assets/SearchTimeline.json'
import notifications1 from './assets/notifications1.json'
import notifications2 from './assets/notifications2.json'
import notifications3 from './assets/notifications3.json'
import {
  blueVerifiedFilter,
  flowFilter,
  mutedWordsFilter,
  MutedWordRule,
  grokFilter,
} from '$lib/filter'
import TweetDetail8ProbableSpam from './assets/TweetDetail8ProbableSpam.json'
import CreateTweet from './assets/CreateTweet.json'
import SearchTimeline2 from './assets/SearchTimeline2.json'
import TweetEntity from './assets/TweetEntity.json'
import TweetDetail13 from './assets/TweetDetail13.json'
import TweetDetail14 from './assets/TweetDetail14.json'
import TweetDetail16 from './assets/TweetDetail16.json'
import TweetDetail17 from './assets/TweetDetail17.json'
import dm from './assets/dm.json'
import UserByScreenName from './assets/UserByScreenName.json'
import TweetDetail18 from './assets/TweetDetail18.json'
import HomeTimeline2 from './assets/HomeTimeline2.json'
import TweetDetail19 from './assets/TweetDetail19.json'
import TweetDetail20 from './assets/TweetDetail20.json'
import { flowFilterCacheMap } from '$lib/shared'
import HomeTimeline3 from './assets/Homeline3.json'
import UserByScreenName2 from './assets/UserByScreenName2.json'

describe('parseUserRecords', () => {
  it('parse timeline', () => {
    const users = parseUserRecords(timeline)
    expect(users).length(20)
    expect(users.some((it) => it.description?.includes('t.co'))).false
    expect(
      users.map((it) => omit(it, ['created_at', 'updated_at'])),
    ).toMatchSnapshot()
  })
  it('parse all-spam', () => {
    const users = parseUserRecords(allSpam)
    expect(users.map((it) => it.name).some((it) => it.includes('比特币'))).true
    expect(users).length(201)
    expect(
      users.map((it) => omit(it, ['created_at', 'updated_at'])),
    ).toMatchSnapshot()
  })
  it('parse notifications-spam', () => {
    const users = parseUserRecords(notificationsSpam)
    expect(users).length(22)
    expect(users.map((it) => it.name).some((it) => it.includes('比特币'))).true
    expect(users.map((it) => it.name).some((it) => it.includes('币圈'))).true
    expect(
      users.map((it) => omit(it, ['created_at', 'updated_at'])),
    ).toMatchSnapshot()
  })
  it('parse profile', () => {
    const users = parseUserRecords(profile)
    expect(users).length(1)
    expect(pick(users[0], ['id', 'name', 'screen_name'])).toEqual({
      id: '1575013182686777344',
      name: '比特币矿机',
      screen_name: 'bitmain_miner',
    })
  })
  it('parseUserRecords for detail 9', () => {
    const users = parseUserRecords(TweetDetail9)
    expect(users).length(2)
  })
  it('parseUserRecords for dm conversation', () => {
    const users = parseUserRecords(dm)
    expect(users).length(190)
    expect(
      users.map((it) => omit(it, ['created_at', 'updated_at'])),
    ).toMatchSnapshot()
  })
  it('parseUserRecords for user by screen name', () => {
    const user = parseUserRecords(UserByScreenName)
    expect(user).length(1)
    expect(user[0].id).toEqual('1652220971497947136')
    expect(user[0].blocking).true
  })
  it('parseUserRecords for HomeTimeline3', () => {
    const users = parseUserRecords(HomeTimeline3)
    expect(users.filter((it) => it.id === '1409161387230650377')).empty
    expect(users.filter((it) => !it.profile_image_url)).empty
    expect(users.filter((it) => it.profile_image_url!.includes('_normal.')))
      .empty
  })
  it('parseUserRecords for UserByScreenName2', () => {
    const users = parseUserRecords(UserByScreenName2)
    const user = users.find((it) => it.id === '1903966634915840000')
    expect(user?.blocking).true
    expect(user?.following).false
    expect(user?.is_blue_verified).false
    expect(user?.location).empty
  })
})

describe('parseProfileImageUrl', () => {
  it('parseProfileImageUrl', () => {
    expect(
      parseProfileImageUrl(
        'https://pbs.twimg.com/profile_images/1892248257516224513/SzZdRSkx_normal.png',
      ),
    ).toEqual(
      'https://pbs.twimg.com/profile_images/1892248257516224513/SzZdRSkx.png',
    )
    expect(
      parseProfileImageUrl(
        'https://pbs.twimg.com/profile_images/924810703369674752/RIAinmZL_normal.jpg',
      ),
    ).toEqual(
      'https://pbs.twimg.com/profile_images/924810703369674752/RIAinmZL.jpg',
    )
    expect(
      parseProfileImageUrl(
        'https://pbs.twimg.com/profile_images/477264018881511424/sL9Ik8oe_normal.jpeg',
      ),
    ).toEqual(
      'https://pbs.twimg.com/profile_images/477264018881511424/sL9Ik8oe.jpeg',
    )
  })
})

describe('matchObject', () => {
  it('match object in detail', () => {
    const schema = z.object({
      type: z.literal('TimelineAddEntries'),
      entries: z.array(
        z.object({
          entryId: z.string(),
          sortIndex: z.string(),
          content: z.object({}),
        }),
      ),
    })
    const [result] = extractObjects(
      TweetDetail,
      (it) => schema.safeParse(it).success,
    ) as (typeof schema._type)[]
    expect(result.entries).length(12)
  })
})

describe('parseTweets', () => {
  it('parseTweets for timeline', () => {
    const tweets = parseTweets(HomeTimeline)
    expect(tweets).length(46)
    expect(
      tweets.map((it) => ({
        ...it,
        user: omit(it.user, ['updated_at']),
      })),
    ).toMatchSnapshot()
  })
  it('parseTweets for detail 1', () => {
    const tweets = parseTweets(TweetDetail)
    const matched =
      JSON.stringify(TweetDetail).split('"__typename":"Tweet"').length - 1
    const expected = extractObjects(
      TweetDetail,
      (it) =>
        z
          .object({
            __typename: z.literal('Tweet').optional(),
            rest_id: z.string(),
            legacy: z.object({
              full_text: z.string(),
            }),
          })
          .safeParse(it).success,
    ).map((it) => it.rest_id)
    expect(expected).length(matched)
    expect(tweets).length(matched)
    expect(
      tweets.map((it) => ({
        ...it,
        user: omit(it.user, ['updated_at']),
      })),
    ).toMatchSnapshot()
  })
  it('parseTweets for detail 2', () => {
    const tweets = parseTweets(TweetDetail2)
    const matched = JSON.stringify(TweetDetail2).split('"tweet":{').length - 1
    const expected = extractObjects(
      TweetDetail2,
      (it) =>
        z
          .object({
            __typename: z.literal('Tweet').optional(),
            rest_id: z.string(),
            legacy: z.object({
              full_text: z.string(),
            }),
          })
          .safeParse(it).success,
    ).map((it) => it.rest_id)
    expect(expected).length(matched)
    expect(tweets).length(matched)
    expect(
      tweets.map((it) => ({
        ...it,
        user: omit(it.user, ['updated_at']),
      })),
    ).toMatchSnapshot()
  })
  it('parseTweets for detail 3', () => {
    const tweets = parseTweets(TweetDetail3)
    expect(tweets).length(2)
    expect(
      tweets.map((it) => ({
        ...it,
        user: omit(it.user, ['updated_at']),
      })),
    ).toMatchSnapshot()
  })
  it('parseTweets for detail 4', () => {
    const tweets = parseTweets(TweetDetail4)
    expect(tweets).length(4)
    expect(
      tweets.map((it) =>
        pick(it, ['id', 'conversation_id_str', 'in_reply_to_status_id_str']),
      ),
    ).toEqual([
      {
        id: '1892406149732806885',
        conversation_id_str: '1892406149732806885',
        in_reply_to_status_id_str: undefined,
      },
      {
        id: '1892411880901091533',
        conversation_id_str: '1892406149732806885',
        in_reply_to_status_id_str: '1892406149732806885',
      },
      {
        id: '1892419018364957088',
        conversation_id_str: '1892406149732806885',
        in_reply_to_status_id_str: '1892411880901091533',
      },
      {
        id: '1892411189377859986',
        conversation_id_str: '1892406149732806885',
        in_reply_to_status_id_str: '1892406149732806885',
      },
    ])
  })
  it('parseTweets for detail 5', () => {
    const tweets = parseTweets(TweetDetail5)
    expect(tweets).length(5)
    expect(
      tweets.map((it) => pick(it, ['id', 'quoted_status_id_str'])),
    ).toEqual([
      {
        id: '1892375497062945112',
        quoted_status_id_str: '1884801439886713064',
      },
      { id: '1884801439886713064' },
      { id: '1892378282181447757' },
      { id: '1892380896201691602' },
      { id: '1892377153737474157' },
    ])
  })
  it('parseTweets for user tweets and replies', () => {
    const tweets = parseTweets(UserTweetsAndReplies)
    const matched =
      JSON.stringify(UserTweetsAndReplies).split('"__typename":"Tweet"')
        .length - 1
    const expected = extractObjects(
      UserTweetsAndReplies,
      (it) =>
        z
          .object({
            __typename: z.literal('Tweet'),
            rest_id: z.string(),
          })
          .safeParse(it).success,
    ).map((it) => it.rest_id)
    expect(expected).length(matched)
    expect(tweets).length(matched - 2)
    expect(
      tweets.map((it) => ({
        ...it,
        user: omit(it.user, ['updated_at']),
      })),
    ).toMatchSnapshot()
  })
  it('parseTweets for user tweets only', () => {
    const tweets = parseTweets(UserTweets)
    const matched =
      JSON.stringify(UserTweets).split('"__typename":"Tweet"').length - 1
    const expected = extractObjects(
      UserTweets,
      (it) =>
        z
          .object({
            __typename: z.literal('Tweet'),
            rest_id: z.string(),
          })
          .safeParse(it).success,
    ).map((it) => it.rest_id)
    expect(expected).length(matched)
    expect(tweets).length(matched)
    expect(
      tweets.map((it) => ({
        ...it,
        user: omit(it.user, ['updated_at']),
      })),
    ).toMatchSnapshot()
  })
  it('parseTweets for notifications', () => {
    const tweets = parseTweets(notifications1)
    expect(tweets).length(20)
    expect(
      tweets.map((it) => omit(it, ['created_at', 'user'])),
    ).toMatchSnapshot()
  })
  it('parseTweets for probable spam', () => {
    const tweets = parseTweets(TweetDetail8ProbableSpam)
    expect(tweets).length(2)
    expect(tweets.map((it) => it.id)).toEqual([
      '1894889195824615903',
      '1894741492708647035',
    ])
  })
  it('parseTweets for create tweet', () => {
    const tweets = parseTweets(CreateTweet)
    expect(tweets).length(1)
    expect(tweets[0].id).toEqual('1895870325092737311')
  })
  it('parseTweets for t.co link', () => {
    const tweets = parseTweets(TweetEntity)
    expect(tweets).length(1)
    expect(tweets[0].id).toEqual('1897471935401034084')
    expect(tweets[0].text).includes('manus.im')
    expect(tweets[0].text).not.includes('t.co')
  })
  it('parseTweets for ad', () => {
    const r1 = parseTweets(TweetDetail13).filter((it) => it.is_ad)
    expect(r1[0].id).eq('1908274394037969165')
    const r2 = parseTweets(TweetDetail14).filter((it) => it.is_ad)
    expect(r2[0].id).eq('1908412325008380091')
  })
  it('parseTweets for ad(1868231216325148881)', () => {
    const tweets = parseTweets(TweetDetail16)
    expect(tweets.find((it) => it.id === '1868231216325148881')?.is_ad).true
  })
  it('parseTweets for detail 18', () => {
    const tweets = parseTweets(TweetDetail18)
    expect(tweets).length(2)
  })
  it('parseTweets for HomeTimeline2', () => {
    const tweets = parseTweets(HomeTimeline2)
    expect(tweets).length(50)
    expect(tweets.every((it) => it.user.screen_name && it.user.name)).true
  })
})

describe('filterTweets', () => {
  it('filterTweets for detail', () => {
    const spamTweetIds = ['1883173115230134610']
    const json = filterTweets(
      TweetDetail,
      (it) => !spamTweetIds.includes(it.id),
    )
    const tweets = parseTweets(json)
    expect(tweets.some((it) => spamTweetIds.includes(it.id))).false
  })
  it('filterTweets for search timeline', () => {
    const spamTweetIds = ['1885219025005314048']
    const json = filterTweets(SearchTimeline, (it) =>
      spamTweetIds.includes(it.id),
    )
    const tweets = parseTweets(json)
    expect(tweets.some((it) => spamTweetIds.includes(it.id))).false
  })
  it('filterTweets for language', () => {
    const json = filterTweets(TweetDetail20, (it) => it.lang !== 'zh')
    const tweets = parseTweets(json)
    expect(JSON.stringify(json)).not.includes('挂号')
    expect(tweets.every((it) => it.lang !== 'zh')).true
  })
  it('filterTweets for quote', () => {
    const isShow = flowFilter([blueVerifiedFilter('only-blue')])
    const handledJson = filterTweets(
      TweetDetail6,
      (it) =>
        isShow({
          type: 'user',
          user: it.user,
        }).value,
    )
    const tweets = parseTweets(handledJson)
    expect(tweets).length(3)
  })
  it('filterTweets for TimelineAddToModule', () => {
    const r1 = parseTweets(TweetDetail7)
    expect(r1).length(2)
    const filtered = filterTweets(
      TweetDetail7,
      (it) => it.id !== '1892813087004098960',
    )
    const r2 = parseTweets(filtered)
    expect(r2).length(1)
  })
  it('filterTweets for muted words', () => {
    localStorage.setItem(
      MUTED_WORD_RULES_KEY,
      JSON.stringify([
        {
          id: '1',
          keyword: '比特币',
          type: 'hide',
          checkpoints: ['name', 'screen_name', 'description', 'tweet'],
        },
      ] as MutedWordRule[]),
    )
    const filter = mutedWordsFilter()
    const r1 = parseTweets(TweetDetail9)
    expect(r1).length(3)
    const filtered = filterTweets(
      TweetDetail9,
      (it) => filter.tweetCondition!(it) === 'next',
    )
    const r2 = parseTweets(filtered)
    expect(r2).length(2)
  })
  it('filterTweets for SearchTimeline2 (quoted_status_id_str exists but quoted_status_result is {})', () => {
    localStorage.setItem(
      MUTED_WORD_RULES_KEY,
      JSON.stringify([
        {
          id: '1',
          keyword: 'Manus',
          type: 'hide',
          checkpoints: ['tweet'],
        },
      ] as MutedWordRule[]),
    )
    const filter = mutedWordsFilter()
    const r1 = parseTweets(SearchTimeline2)
    expect(r1.some((it) => it.text.includes('Manus'))).true
    const filtered = filterTweets(
      SearchTimeline2,
      (it) => filter.tweetCondition!(it) === 'next',
    )
    const r2 = parseTweets(filtered)
    expect(r2.some((it) => it.text.includes('Manus'))).false
  })
  it('filterTweets for grok', () => {
    const json = filterTweets(
      TweetDetail10,
      (it) => grokFilter().tweetCondition!(it) === 'next',
    )
    const tweets = parseTweets(json)
    expect(tweets.some((it) => it.text.includes('grok'))).false
  })
  it('filterTweets for grok(new)', () => {
    const isShow = flowFilter([grokFilter()])
    const json = filterTweets(
      TweetDetail17,
      (it) =>
        isShow({
          type: 'tweet',
          tweet: it,
        }).value,
    )
    expect(JSON.stringify(json).includes('@grok')).false
    expect(JSON.stringify(json).includes('@gork')).false
    expect(JSON.stringify(json).includes('1915714875671691420')).false
  })
  it('filterTweets for quote hide tweet', () => {
    const hideQuoteTweetId = '1925307171253715147'
    const isShow = flowFilter([
      {
        name: 'test',
        tweetCondition: (tweet) =>
          tweet.id === hideQuoteTweetId ? 'hide' : 'next',
      },
    ])
    const original = parseTweets(TweetDetail19)
    expect(original.some((it) => it.id === hideQuoteTweetId)).true
    const json = filterTweets(
      TweetDetail19,
      (it) =>
        isShow({
          type: 'tweet',
          tweet: it,
        }).value,
    )
    const tweets = parseTweets(json)
    expect(tweets.some((it) => it.id === hideQuoteTweetId)).true
  })
})

describe('filterNotifications', () => {
  beforeEach(() => {
    flowFilterCacheMap.clear()
  })
  afterEach(() => {
    flowFilterCacheMap.clear()
  })
  const users = {
    'user-1': {
      id_str: 'user-1',
      name: 'user-1',
      screen_name: 'user-1',
      ext_is_blue_verified: true,
      url: null,
    },
    'user-2': {
      id_str: 'user-2',
      name: 'user-2',
      screen_name: 'user-2',
      ext_is_blue_verified: true,
      url: null,
    },
  }
  it('filterNotifications for like', () => {
    const r = filterNotifications(
      {
        globalObjects: {
          notifications: {
            '1': {
              icon: {
                id: 'heart_icon',
              },
              template: {
                aggregateUserActionsV1: {
                  fromUsers: [
                    { user: { id: 'user-1' } },
                    { user: { id: 'user-2' } },
                  ],
                },
              },
            },
          },
          tweets: {},
          users,
        },
        timeline: {
          instructions: [],
        },
      },
      (it) => it.type === 'user' && it.user.id !== 'user-1',
    )
    expect(
      r.globalObjects.notifications?.['1'].template.aggregateUserActionsV1
        .fromUsers,
    ).toEqual([{ user: { id: 'user-2' } }])
  })
  it('filterNotifications for hide all like users', () => {
    const r = filterNotifications(
      {
        globalObjects: {
          notifications: {
            '1': {
              icon: {
                id: 'heart_icon',
              },
              template: {
                aggregateUserActionsV1: {
                  fromUsers: [{ user: { id: 'user-1' } }],
                },
              },
            },
          },
          tweets: {},
          users,
        },
        timeline: {
          instructions: [],
        },
      },
      (it) => it.type === 'user' && it.user.id !== 'user-1',
    )
    expect(r.globalObjects.notifications).toEqual({})
  })
  it('filterNotifications for spam tweet', () => {
    const r = filterNotifications(
      {
        globalObjects: {
          notifications: {
            '1': {
              icon: {
                id: 'heart_icon',
              },
              template: {
                aggregateUserActionsV1: {
                  fromUsers: [{ user: { id: 'user-1' } }],
                },
              },
            },
          },
          tweets: {
            '1': {
              id_str: '1',
              full_text: 'BTC is the best',
              created_at: '2025-01-01',
              user_id_str: 'user-1',
              lang: 'en',
              conversation_id_str: '1',
              entities: {},
              source:
                '"<a href="https://mobile.twitter.com" rel="nofollow">Twitter Web App</a>"',
            },
          },
          users,
        },
        timeline: {
          instructions: [
            {
              addEntries: {
                entries: [
                  {
                    entryId: '1',
                    sortIndex: '1',
                    content: {
                      item: {
                        content: {
                          tweet: {
                            id: '1',
                            displayType: 'Tweet',
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      (it) => it.type === 'tweet' && !it.tweet.text.includes('BTC'),
    )
    expect(JSON.stringify(r.timeline)).not.includes('BTC')
    expect(JSON.stringify(r.globalObjects.tweets)).not.includes('BTC')
  })
  it('filterNotifications for notifications1', () => {
    const blockId = '1868318759716552704'
    expect(JSON.stringify(notifications1.globalObjects.notifications)).includes(
      blockId,
    )
    const r = filterNotifications(
      notifications1 as any,
      (it) => it.type === 'user' && it.user.id !== blockId,
    )
    expect(JSON.stringify(r.globalObjects.notifications)).not.includes(blockId)
  })
  it('filterNotifications for notifications2', () => {
    filterNotifications(notifications2 as any, () => true)
  })
  it('filterNotifications for notifications3', () => {
    filterNotifications(notifications3 as any, () => true)
  })
  it('filterNotifications for unknown notification', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    filterNotifications(
      {
        globalObjects: {
          notifications: {
            '1': {
              icon: {
                id: 'bell_icon',
              },
              template: {
                aggregateUserActionsV1: {
                  fromUsers: [{ user: { id: 'user-1' } }],
                },
              },
            },
          },
        },
        timeline: {
          instructions: [],
        },
      } as any,
      () => true,
    )
    expect(log).not.toHaveBeenCalled()
  })
  it('flowFilter', () => {
    const isShow = flowFilter([
      {
        name: 'filter1',
        userCondition: (user) => {
          return user.id === 'user-3' ? 'show' : 'next'
        },
      },
      {
        name: 'filter2',
        tweetCondition: (tweet) => (tweet.id === 'test-1' ? 'hide' : 'next'),
      },
      {
        name: 'filter3',
        userCondition: (user) => (user.id === 'user-1' ? 'hide' : 'next'),
      },
    ])
    expect(
      isShow({
        type: 'tweet',
        tweet: { id: 'test-1', user: {} } as ParsedTweet,
      }).value,
    ).false
    expect(
      isShow({
        type: 'tweet',
        tweet: { id: 'test-2', user: { id: 'user-3' } } as ParsedTweet,
      }).value,
    ).true
    expect(
      isShow({
        type: 'tweet',
        tweet: { id: 'test-3', user: {} } as ParsedTweet,
      }).value,
    ).true
    expect(
      isShow({
        type: 'tweet',
        tweet: { id: 'test-4', user: { id: 'user-1' } } as ParsedTweet,
      }).value,
    ).false
    expect(
      isShow({
        type: 'tweet',
        tweet: { id: 'test-5', user: { id: 'user-2' } } as ParsedTweet,
      }).value,
    ).true
  })
})
