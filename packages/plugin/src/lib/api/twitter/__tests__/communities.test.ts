import { describe, expect, it } from 'vitest'
import {
  CommunityInfo,
  parseCommunityInfo,
  parseCommunityMembers,
} from '../communities'
import CommunityQuery from './assets/CommunityQuery.json'
import MembersSliceTimelineQuery from './assets/MembersSliceTimeline_Query.json'
import { omit } from 'lodash-es'

describe('parseCommunityMembers', () => {
  it('parseCommunityMembers', () => {
    const users = parseCommunityMembers(MembersSliceTimelineQuery)
    expect(users.data).length(20)
    expect(users.data.every((it) => it.id && it.community_role)).true
    expect(users.cursor).not.undefined
    expect(users.cursor).toMatchSnapshot()
    expect(
      users.data.map((it) => omit(it, 'created_at', 'updated_at')),
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
