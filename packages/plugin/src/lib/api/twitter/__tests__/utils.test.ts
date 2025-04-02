import { describe, beforeAll, vi, it, expect } from 'vitest'
import { extractAllFlags, extractGQLArgsFromString } from '../utils'
import { readFile } from 'fs/promises'
import path from 'path'

describe('extractFlags', () => {
  beforeAll(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (input.toString() === 'https://x.com/home') {
        const text = await readFile(
          path.join(__dirname, './assets/home.html'),
          'utf-8',
        )
        return new Response(text, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        })
      }
      throw new Error()
    })
  })
  it('extractFlags', async () => {
    const flags = await extractAllFlags()
    expect(flags).toMatchSnapshot()
  })
  it('extractGQLArgsFromString', async () => {
    const text = await readFile(
      path.join(__dirname, './assets/main.352f1ffa.js'),
      'utf-8',
    )
    const args = extractGQLArgsFromString(text)
    expect(args.some((it) => it.operationName === 'BlockedAccountsAll')).true
    expect(args.some((it) => it.operationName === 'getAltTextPromptPreference'))
      .true
    expect(args.some((it) => it.operationName === 'Followers')).true
    expect(args.some((it) => it.operationName === 'Following')).true
    expect(args.some((it) => it.operationName === 'BlueVerifiedFollowers')).true
    expect(args).toMatchSnapshot()
  })
  it('extractGQLArgsForBlockedAccountsAll', async () => {
    const text = await readFile(
      path.join(__dirname, './assets/main.352f1ffa.js'),
      'utf-8',
    )
    const args = extractGQLArgsFromString(text)
    const blockedAccountsAll = args.find(
      (it) => it.operationName === 'BlockedAccountsAll',
    )
    expect(blockedAccountsAll).not.undefined
    const allFlags = await extractAllFlags()
    const flags = blockedAccountsAll?.metadata.featureSwitches.reduce(
      (c, k) => {
        expect(allFlags[k]).not.undefined
        return {
          ...c,
          [k]: allFlags[k],
        }
      },
      {} as Record<string, boolean | number | string>,
    )
    expect(flags).toMatchSnapshot()
  })
})
