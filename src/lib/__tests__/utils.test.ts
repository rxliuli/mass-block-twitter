import { extractObjects } from '$lib/util/extractObjects'
import { it, expect, describe } from 'vitest'
import all from './assets/all.json'
import timeline from './assets/timeline.json'
import { z } from 'zod'
import {
  filterTweets,
  parseTweets,
  parseUserRecords,
  tweetScheam,
} from '../api'
import allSpam from './assets/all-spam.json'
import { difference, omit, pick } from 'lodash-es'
import notificationsSpam from './assets/notifications-spam.json'
import profile from './assets/ProfileSpotlightsQuery.json'
import HomeTimeline from './assets/HomeTimeline.json'
import TweetDetail from './assets/TweetDetail.json'
import TweetDetail2 from './assets/TweetDetail2.json'
import TweetDetail3 from './assets/TweetDetail3.json'
import UserTweetsAndReplies from './assets/UserTweetsAndReplies.json'
import UserTweets from './assets/UserTweets.json'

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
    expect(
      users.map((it) => omit(it, 'created_at', 'updated_at')),
    ).toMatchSnapshot()
  })

  it('parse notifications-spam', () => {
    const users = parseUserRecords(notificationsSpam)
    expect(users.map((it) => it.name).some((it) => it.includes('比特币'))).true
    expect(users.map((it) => it.name).some((it) => it.includes('币圈'))).true
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
})

describe('filterTweets', () => {
  it('filterTweets for detail', () => {
    const spamTweetIds = ['1883173115230134610']
    const json = filterTweets(TweetDetail, (it) => spamTweetIds.includes(it.id))
    const tweets = parseTweets(json)
    expect(tweets.some((it) => spamTweetIds.includes(it.id))).false
  })
})
