import { extractObjects } from '$lib/util/extractObjects'
import { it, expect, describe } from 'vitest'
import all from './assets/all.json'
import all2 from './assets/all2.json'
import timeline from './assets/timeline.json'
import { z } from 'zod'
import {
  filterTweets,
  ParsedTweet,
  parseSearchPeople,
  parseTweets,
  parseUserRecords,
} from '../api'
import allSpam from './assets/all-spam.json'
import { omit, pick } from 'lodash-es'
import notificationsSpam from './assets/notifications-spam.json'
import profile from './assets/ProfileSpotlightsQuery.json'
import HomeTimeline from './assets/HomeTimeline.json'
import TweetDetail from './assets/TweetDetail.json'
import TweetDetail2 from './assets/TweetDetail2.json'
import TweetDetail3 from './assets/TweetDetail3.json'
import TweetDetail4 from './assets/TweetDetail4.json'
import TweetDetail5 from './assets/TweetDetail5.json'
import UserTweetsAndReplies from './assets/UserTweetsAndReplies.json'
import UserTweets from './assets/UserTweets.json'
import SearchTimeline from './assets/SearchTimeline.json'
import SearchTimelinePeople from './assets/SearchTimelinePeople.json'
import SearchTimelinePeople2 from './assets/SearchTimelinePeople2.json'
import HomeLatestTimeline from './assets/HomeLatestTimeline.json'
import { flowFilter } from '$lib/filter'

describe('extractObjects', () => {
  it('extractObjects 1', () => {
    const json = {
      users: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ],
    }
    const users = extractObjects(json, (obj) => obj.name)
    expect(users).toEqual([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ])
  })
  it('extractObjects 2', () => {
    const json = {
      users: {
        1: { id: 1, name: 'John' },
        2: { id: 2, name: 'Jane' },
      },
    }
    const users = extractObjects(json, (obj) => obj.name)
    expect(users).toEqual([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ])
  })
  it('extractObjects 3', () => {
    const userSchema = z.object({
      id: z.number(),
      name: z.string(),
      screen_name: z.string(),
      location: z.string().nullable(),
      description: z.string().nullable(),
      followers_count: z.number().int(),
      friends_count: z.number().int(),
      verified: z.boolean(),
      created_at: z.string(),
    })
    const users = extractObjects(
      all,
      (obj) => userSchema.safeParse(obj).success,
    )
    expect(users).length(10)
  })
})

describe('parseUserRecords', () => {
  it('parse timeline', () => {
    const users = parseUserRecords(timeline)
    expect(users).length(20)
    expect(
      users.map((it) => omit(it, 'created_at', 'updated_at')),
    ).toMatchSnapshot()
  })

  it('parse all-spam', () => {
    const users = parseUserRecords(allSpam)
    expect(users.map((it) => it.name).some((it) => it.includes('比特币'))).true
    expect(users).length(201)
    expect(
      users.map((it) => omit(it, 'created_at', 'updated_at')),
    ).toMatchSnapshot()
  })

  it('parse notifications-spam', () => {
    const users = parseUserRecords(notificationsSpam)
    expect(users.map((it) => it.name).some((it) => it.includes('比特币'))).true
    expect(users.map((it) => it.name).some((it) => it.includes('币圈'))).true
    expect(users).length(23)
    expect(
      users.map((it) => omit(it, 'created_at', 'updated_at')),
    ).toMatchSnapshot()
  })

  it('parse profile', () => {
    const users = parseUserRecords(profile)
    expect(users).length(1)
    expect(pick(users[0], 'id', 'name', 'screen_name')).toEqual({
      id: '1575013182686777344',
      name: '比特币矿机',
      screen_name: 'bitmain_miner',
    })
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
        user: omit(it.user, 'updated_at'),
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
        user: omit(it.user, 'updated_at'),
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
        user: omit(it.user, 'updated_at'),
      })),
    ).toMatchSnapshot()
  })
  it('parseTweets for detail 3', () => {
    const tweets = parseTweets(TweetDetail3)
    expect(tweets).length(2)
    expect(
      tweets.map((it) => ({
        ...it,
        user: omit(it.user, 'updated_at'),
      })),
    ).toMatchSnapshot()
  })
  it('parseTweets for detail 4', () => {
    const tweets = parseTweets(TweetDetail4)
    expect(tweets).length(4)
    expect(
      tweets.map((it) =>
        pick(it, 'id', 'conversation_id_str', 'in_reply_to_status_id_str'),
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
    expect(tweets.map((it) => pick(it, 'id', 'quoted_status_id_str'))).toEqual([
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
        user: omit(it.user, 'updated_at'),
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
        user: omit(it.user, 'updated_at'),
      })),
    ).toMatchSnapshot()
  })
  it.todo('parseTweets for all2', () => {
    const tweets = parseTweets(all2)
    console.log(tweets.map((it) => it.id))
    // expect(tweets).length(10)
    // expect(
    //   tweets.map((it) => omit(it, 'created_at', 'updated_at')),
    // ).toMatchSnapshot()
  })
})

describe('filterTweets', () => {
  it('filterTweets for detail', () => {
    const spamTweetIds = ['1883173115230134610']
    const json = filterTweets(TweetDetail, (it) => spamTweetIds.includes(it.id))
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
    const json = filterTweets(HomeLatestTimeline, (it) => it.lang === 'zh')
    const tweets = parseTweets(json)
    expect(JSON.stringify(json)).not.includes('挂号')
    expect(tweets.every((it) => it.lang !== 'zh')).true
  })
  it('flowFiltter', () => {
    const isHide = flowFilter([
      {
        name: 'test1',
        condition: (tweet) => tweet.id === 'test-1',
      },
      {
        name: 'test2',
        condition: (tweet) => tweet.user.id === 'user-1',
      },
    ])
    expect(isHide({ id: 'test-1' } as ParsedTweet)).false
    expect(isHide({ id: 'test-2', user: {} } as ParsedTweet)).true
    expect(isHide({ id: 'test-3', user: { id: 'user-1' } } as ParsedTweet))
      .false
    expect(isHide({ id: 'test-4', user: { id: 'user-2' } } as ParsedTweet)).true
  })
})

describe('parseSearchPeople', () => {
  function extractCursor(json: any) {
    const schema = z.object({
      entryType: z.literal('TimelineTimelineCursor'),
      value: z.string(),
      cursorType: z.literal('Bottom'),
    })
    return (
      extractObjects(json, (it) => schema.safeParse(it).success) as z.infer<
        typeof schema
      >[]
    )[0].value
  }

  it('parseSearchPeople p1', async () => {
    const r = parseSearchPeople(SearchTimelinePeople)
    expect(r.data).length(20)
    const cursor = extractCursor(SearchTimelinePeople)
    expect(r.cursor).eq(cursor)
  })
  it('parseSearchPeople p2', async () => {
    const r = parseSearchPeople(SearchTimelinePeople2)
    expect(r.data).length(20)
    const cursor = extractCursor(SearchTimelinePeople2)
    expect(r.cursor).eq(cursor)
  })
})
