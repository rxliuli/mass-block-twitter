import { describe, expect, it, vi } from 'vitest'
import {
  CommunityInfo,
  extractCommunityGraphqlId,
  extractParamsData,
  parseCommunityInfo,
  parseCommunityMembers,
} from '../communities'
import CommunityQuery from './assets/CommunityQuery.json'
import MembersSliceTimelineQuery from './assets/MembersSliceTimeline_Query.json'
import { omit } from 'es-toolkit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { existsSync } from 'node:fs'

describe('parseCommunityMembers', () => {
  it('parseCommunityMembers', () => {
    const users = parseCommunityMembers(MembersSliceTimelineQuery)
    expect(users.data).length(20)
    expect(users.data.every((it) => it.id && it.community_role)).true
    expect(users.cursor).not.undefined
    expect(users.cursor).toMatchSnapshot()
    expect(
      users.data.map((it) => omit(it, ['created_at', 'updated_at'])),
    ).toMatchSnapshot()
  })
})

describe('parseCommunityInfo', () => {
  it('parseCommunityInfo', () => {
    const info = parseCommunityInfo(CommunityQuery)
    expect(info).toEqual({
      id: '1900366536683987325',
      name: 'Misa',
      description: 'Misa',
      member_count: 6700,
      is_nsfw: false,
    } satisfies CommunityInfo)
  })
})

describe('extractCommunityMembersGraphqlId', () => {
  describe('extractParamsData', () => {
    it('match membersSliceTimeline_Query', async () => {
      const str = await readFile(
        path.resolve(
          __dirname,
          './assets/bundle.Communities-59468b1d.8fa9766a.js',
        ),
        'utf-8',
      )
      expect(extractParamsData(str)).toEqual({
        id: 'V7OdnMvujMPsCctT_daznQ',
        name: 'membersSliceTimeline_Query',
      })
    })
    it('match CommunityQuery', async () => {
      const str = await readFile(
        path.resolve(
          __dirname,
          './assets/bundle.Communities-fd196509.ad9e9baa.js',
        ),
        'utf-8',
      )
      expect(extractParamsData(str)).toEqual({
        id: 'YDYGxdoPEu0zNC2eWP_0MQ',
        name: 'CommunityQuery',
      })
    })
    it('no match', async () => {
      const str = await readFile(
        path.resolve(
          __dirname,
          './assets/bundle.Communities-e019dbda.95f5148a.js',
        ),
        'utf-8',
      )
      expect(extractParamsData(str)).undefined
    })
    it('match membersSliceTimeline_Query 2', async () => {
      const str = await readFile(
        path.resolve(
          __dirname,
          './assets/bundle.Communities-59468b1d.c13c666a.js',
        ),
        'utf-8',
      )
      expect(extractParamsData(str)).toEqual({
        id: 'D5_l6jsKx4k9hr5T8mn-vQ',
        name: 'membersSliceTimeline_Query',
      })
    })
  })

  it('extractCommunityMembersGraphqlId', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const fsPath = path.resolve(
        __dirname,
        './assets/' + path.basename(url.toString()),
      )
      if (existsSync(fsPath)) {
        return new Response(await readFile(fsPath, 'utf-8'), {
          headers: {
            'Content-Type': 'application/javascript',
          },
        })
      }
      throw new Error('test')
    })
    const id = await extractCommunityGraphqlId('membersSliceTimeline_Query')
    expect(id).eq('V7OdnMvujMPsCctT_daznQ')
  })
})
