// @vitest-environment happy-dom
import {
  filterTweets,
  MUTED_WORD_RULES_KEY,
  ParsedTweet,
  parseSourceType,
  parseTweets,
} from '$lib/api'
import { User } from '$lib/db'
import {
  adFilter,
  defaultProfileFilter,
  FilterData,
  flowFilter,
  flowFilterCacheMap,
  grokFilter,
  modListFilter,
  MutedWordRule,
  mutedWordsFilter,
  spamContext,
  TweetFilter,
} from '$lib/filter'
import { Rule } from '$lib/rule'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TweetDetail11 from './assets/TweetDetail11.json'
import TweetDetail12 from './assets/TweetDetail12.json'

describe('defaultProfileFilter', () => {
  const filter = defaultProfileFilter()
  it('should match hide', () => {
    expect(
      filter.userCondition!({
        default_profile: true,
        default_profile_image: true,
        followers_count: 0,
      } as User),
    ).toBe('hide')
  })
  it('should match next', () => {
    expect(
      filter.userCondition!({
        default_profile: true,
        default_profile_image: true,
        followers_count: 1,
      } as User),
    ).toBe('next')
  })
})

describe('mutedWordsFilter', () => {
  it('should return next when no rules', () => {
    const filter = mutedWordsFilter()
    expect(
      filter.userCondition!({
        name: 'test',
        screen_name: 'test',
        description: 'test',
      } as User),
    ).toBe('next')
  })
  it('should return hide when rule matches', () => {
    localStorage.setItem(
      MUTED_WORD_RULES_KEY,
      JSON.stringify([
        {
          id: '1',
          keyword: 'test1',
          type: 'hide',
          checkpoints: ['name', 'screen_name', 'description', 'tweet'],
        },
      ] as MutedWordRule[]),
    )
    const filter = mutedWordsFilter()
    expect(filter.userCondition!({ name: 'test1' } as User)).toBe('hide')
    expect(filter.userCondition!({ screen_name: 'test1' } as User)).toBe('hide')
    expect(filter.userCondition!({ description: 'test1' } as User)).toBe('hide')
    expect(filter.userCondition!({ name: 'test2' } as User)).toBe('next')
  })
  it('should return block when rule matches', () => {
    localStorage.setItem(
      MUTED_WORD_RULES_KEY,
      JSON.stringify([
        {
          id: '1',
          keyword: 'test1',
          type: 'block',
          checkpoints: ['name'],
        },
      ] as MutedWordRule[]),
    )
    const filter = mutedWordsFilter()
    expect(filter.userCondition!({ name: 'test1' } as User)).toBe('block')
    expect(filter.userCondition!({ name: 'test2' } as User)).toBe('next')
  })
  it('should match tweet when rule matches', () => {
    localStorage.setItem(
      MUTED_WORD_RULES_KEY,
      JSON.stringify([
        {
          id: '1',
          keyword: 'test1',
          type: 'hide',
          checkpoints: ['tweet'],
        },
      ] as MutedWordRule[]),
    )
    const filter = mutedWordsFilter()
    expect(
      filter.tweetCondition!({ text: 'test1', user: {} } as ParsedTweet),
    ).toBe('hide')
    expect(
      filter.tweetCondition!({ text: 'test2', user: {} } as ParsedTweet),
    ).toBe('next')
  })
  it('should match location when rule matches', () => {
    localStorage.setItem(
      MUTED_WORD_RULES_KEY,
      JSON.stringify([
        {
          id: '1',
          keyword: 'test1',
          type: 'block',
          checkpoints: ['location'],
        },
      ] as MutedWordRule[]),
    )
    const filter = mutedWordsFilter()
    expect(filter.userCondition!({ location: 'test1' } as User)).toBe('block')
  })
})

describe('modListFilter', () => {
  beforeEach(() => {
    spamContext.modlists = []
  })
  it('should return next when no rules', () => {
    const filter = modListFilter()
    expect(
      filter.userCondition!({
        id: '1',
        screen_name: 'test',
        name: 'test',
        profile_image_url: 'test',
        description: 'test',
      } as User),
    ).eq('next')
  })
  it('should return block when rule matches', () => {
    spamContext.modlists = [
      {
        modListId: '1',
        action: 'block',
        twitterUserIds: ['1'],
        rules: [
          {
            or: [
              {
                and: [
                  {
                    field: 'user.description',
                    operator: 'cont',
                    value: 'test',
                  },
                ],
              },
            ],
          } satisfies Rule,
        ],
      },
    ]
    const filter = modListFilter()
    expect(
      filter.userCondition!({
        id: '1',
        description: 'test user',
      } as User),
    ).eq('block')
  })
  it('should return hide when rule matches', () => {
    spamContext.modlists = [
      {
        modListId: '1',
        action: 'hide',
        twitterUserIds: ['1'],
        rules: [],
      },
    ]
    const filter = modListFilter()
    expect(
      filter.userCondition!({
        id: '1',
        description: 'test user',
      } as User),
    ).eq('hide')
  })
  it('should return block when real rule matches', () => {
    spamContext.modlists = [
      {
        modListId: '01JQAQPVHGS8HZBDBAQ6D10BNF',
        action: 'block',
        twitterUserIds: [],
        rules: [
          {
            or: [
              {
                and: [
                  {
                    field: 'user.description',
                    operator: 'cont',
                    value: '58fans.com',
                  },
                ],
              },
              {
                and: [
                  {
                    field: 'user.description',
                    operator: 'cont',
                    value: '58mhao.com',
                  },
                ],
              },
              {
                and: [
                  {
                    field: 'user.description',
                    operator: 'cont',
                    value: 'fens88.com',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]
    const filter = modListFilter()
    expect(
      filter.userCondition!({
        id: '1',
        description: '58fans.com',
      } as User),
    ).eq('block')
  })
})

describe('flowFilter', () => {
  beforeEach(() => {
    flowFilterCacheMap.clear()
  })
  afterEach(() => {
    flowFilterCacheMap.clear()
  })
  it('should return true when no rules', () => {
    const filter = flowFilter([])
    expect(filter({ type: 'tweet', tweet: {} } as FilterData).value).true
  })
  it('should return false when hide', () => {
    const filter = flowFilter([{ name: 'test', userCondition: () => 'hide' }])
    expect(filter({ type: 'tweet', tweet: {} } as FilterData).value).false
  })
  it('should return cache with same key', () => {
    const f = vi.fn().mockImplementation(() => 'next')
    const filters: TweetFilter[] = [{ name: 'test', userCondition: f }]
    expect(
      flowFilter(filters)({ type: 'tweet', tweet: { id: '1' } } as FilterData)
        .value,
    ).true
    expect(
      flowFilter(filters)({ type: 'tweet', tweet: { id: '1' } } as FilterData)
        .value,
    ).true
    expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('grokFilter', () => {
  it('should return hide when tweet contains @grok', () => {
    const filter = grokFilter()
    expect(
      filter.tweetCondition!({ text: '@grok', user: {} } as ParsedTweet),
    ).toBe('hide')
    expect(
      filter.tweetCondition!({ text: '@Grok', user: {} } as ParsedTweet),
    ).toBe('hide')
    expect(
      filter.tweetCondition!({
        text: 'test',
        user: { screen_name: 'grok' },
      } as ParsedTweet),
    ).toBe('hide')
    expect(
      filter.tweetCondition!({
        text: 'test',
        user: { screen_name: 'test' },
      } as ParsedTweet),
    ).toBe('next')
  })
  it('filterTweets', () => {
    const isShow = flowFilter([grokFilter()])
    const handledJson = filterTweets(
      TweetDetail11,
      (it) =>
        isShow({
          type: 'tweet',
          tweet: it,
        }).value,
    )
    const tweets = parseTweets(handledJson)
    expect(tweets.every((it) => !it.text.toLowerCase().includes('@grok'))).true
    expect(tweets.every((it) => !it.user.screen_name.includes('grok'))).true
    expect(tweets).length(10)
  })
})

describe('adFilter', () => {
  it('should return hide when tweet is advertiser', () => {
    expect(
      parseTweets(TweetDetail12).some(
        (it) => parseSourceType(it.source) === 'advertiser',
      ),
    ).true
    const isShow = flowFilter([adFilter()])
    const handledJson = filterTweets(
      TweetDetail12,
      (it) =>
        isShow({
          type: 'tweet',
          tweet: it,
        }).value,
    )
    expect(
      parseTweets(handledJson).some(
        (it) => parseSourceType(it.source) === 'advertiser',
      ),
    ).false
  })
})
