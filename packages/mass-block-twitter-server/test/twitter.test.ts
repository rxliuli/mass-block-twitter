import { describe, expect, it, vi } from 'vitest'
import type { TwitterSpamReportRequest } from '../src/routes/twitter'
import { initCloudflareTest } from './utils'

let context = initCloudflareTest()

async function add(spamUserId: string, reportUserId: string, tweetId: string) {
  const spamReport: TwitterSpamReportRequest = {
    spamUser: {
      id: spamUserId,
      screen_name: `test ${spamUserId}`,
      name: `test ${spamUserId}`,
      description: `test ${spamUserId}`,
      profile_image_url: `test ${spamUserId}`,
      created_at: new Date().toISOString(),
    },
    reportUser: {
      id: reportUserId,
      screen_name: `test ${reportUserId}`,
      name: `test ${reportUserId}`,
      description: `test ${reportUserId}`,
      profile_image_url: `test ${reportUserId}`,
      created_at: new Date().toISOString(),
    },
    context: {
      tweet: {
        id: tweetId,
        text: 'test',
        created_at: new Date().toISOString(),
      },
      page_url: 'https://x.com/home',
      page_type: 'timeline',
    },
  }
  return fetch('/api/twitter/spam-users', {
    method: 'POST',
    body: JSON.stringify(spamReport),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

async function getSpamUsers(): Promise<Record<string, number>> {
  const users = await context.prisma.user.findMany({
    where: { spamReportCount: { gt: 0 } },
  })
  return users.reduce((acc, user) => {
    acc[user.id] = user.spamReportCount
    return acc
  }, {} as Record<string, number>)
}

it('should be able to report spam', async () => {
  expect((await add('1', '2', '1')).ok).true
  expect((await add('1', '2', '2')).ok).true
  expect((await add('1', '3', '1')).ok).true
  expect((await add('2', '3', '1')).ok).true
  const users = await getSpamUsers()
  expect(users).toEqual({ '1': 2, '2': 1 })
})

it('should be duplicate spam report', async () => {
  expect((await add('1', '2', '1')).ok).true
  expect((await add('1', '2', '1')).ok).true
  expect((await add('1', '2', '1')).ok).true
  const users = await getSpamUsers()
  expect(users).toEqual({ '1': 1 })
})

describe('should be get spam users for type', () => {
  const getSpamUsers = async (force?: boolean) => {
    const params = new URLSearchParams()
    if (force) {
      params.set('force', 'true')
    }
    const r = await fetch(
      `/api/twitter/spam-users-for-type?${params.toString()}`,
    )
    expect(r.ok).true
    return (await r.json()) as Record<string, 'spam' | 'report'>
  }
  it('should be get spam users for type', async () => {
    expect((await add('2', '1', '2')).ok).true
    expect((await add('3', '1', '3')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
    expect((await add('4', '1', '4')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
  })
  it('should be get spam users for type with force', async () => {
    expect((await add('2', '1', '2')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report' })
    expect((await add('3', '1', '3')).ok).true
    expect(await getSpamUsers(true)).toEqual({ '2': 'report', '3': 'report' })
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
  })
  it('should be get spam users for type with expired cache', async () => {
    vi.setSystemTime(new Date(1998, 11, 19))
    expect((await add('2', '1', '2')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report' })
    expect((await add('3', '1', '3')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report' })
    vi.setSystemTime(Date.now() + 1000 * 60 * 60 * 24 + 1)
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
  })
})
