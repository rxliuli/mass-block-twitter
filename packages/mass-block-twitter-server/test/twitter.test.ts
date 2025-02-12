import { beforeEach, describe, expect, it, vi } from 'vitest'
import { spamReportRequestSchema } from '../src/lib/request'
import sortBy from 'just-sort-by'

beforeEach(async () => {
  const resp = await fetch('http://localhost:8787/test/spam-users', {
    method: 'DELETE',
  })
  expect(resp.ok).true
})

async function add(spamUserId: string, reportUserId: string, tweetId: string) {
  const spamReport: typeof spamReportRequestSchema._type = {
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
  return await fetch('http://localhost:8787/spam-users', {
    method: 'POST',
    body: JSON.stringify(spamReport),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

it('should be able to report spam', async () => {
  expect((await add('1', '2', '1')).ok).true
  expect((await add('1', '2', '2')).ok).true
  expect((await add('1', '3', '1')).ok).true
  expect((await add('2', '3', '1')).ok).true
  const r2 = await fetch('http://localhost:8787/spam-users', { method: 'GET' })
  expect(r2.ok).true
  const data = (await r2.json()) as { id: string; spamReportCount: number }[]
  expect(data).toEqual({ '1': 2, 2: 1 })
})

it('should be duplicate spam report', async () => {
  expect((await add('1', '2', '1')).ok).true
  expect((await add('1', '2', '1')).ok).true
  expect((await add('1', '2', '1')).ok).true
  const r2 = await fetch('http://localhost:8787/spam-users', { method: 'GET' })
  expect(r2.ok).true
  const data = (await r2.json()) as { id: string; spamReportCount: number }[]
  expect(data).toEqual({ '1': 1 })
})

describe('should be get spam users for type', () => {
  const getSpamUsers = async (force?: boolean) => {
    const u = new URL('http://localhost:8787/spam-users-for-type')
    if (force) {
      u.searchParams.set('force', 'true')
    }
    const r = await fetch(u.toString())
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
  it.skip('should be get spam users for type with expired cache', async () => {
    vi.setSystemTime(new Date(1998, 11, 19))
    expect((await add('2', '1', '2')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report' })
    expect((await add('3', '1', '3')).ok).true
    expect(await getSpamUsers()).toEqual({ '2': 'report' })
    vi.setSystemTime(Date.now() + 1000 * 60 * 60 * 24 + 1)
    expect(await getSpamUsers()).toEqual({ '2': 'report', '3': 'report' })
  })
})
