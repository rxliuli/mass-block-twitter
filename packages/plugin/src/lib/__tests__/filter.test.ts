// @vitest-environment happy-dom
import { MUTED_WORD_RULES_KEY, ParsedTweet } from '$lib/api'
import { User } from '$lib/db'
import {
  defaultProfileFilter,
  MutedWordRule,
  mutedWordsFilter,
} from '$lib/filter'
import { describe, expect, it } from 'vitest'

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
