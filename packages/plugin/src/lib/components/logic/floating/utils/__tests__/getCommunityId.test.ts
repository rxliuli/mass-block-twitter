import { expect, it } from 'vitest'
import { getCommunityId } from '../getCommunityId'

it('getCommunityId', () => {
  const list = [
    'https://x.com/i/communities/1900366536683987325',
    'https://x.com/i/communities/1900366536683987325/',
    'https://x.com/i/communities/1900366536683987325/members',
    'https://x.com/i/communities/1900366536683987325/members/',
    'https://x.com/i/communities/1900366536683987325/moderators',
    'https://x.com/i/communities/1900366536683987325/about',
  ]
  list.forEach((it) => {
    expect(getCommunityId(it)).toBe('1900366536683987325')
  })
})
