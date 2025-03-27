import { expect, it } from 'vitest'
import { getCommunityId } from '../getCommunityId'

it('getCommunityId', () => {
  expect(
    getCommunityId('https://x.com/i/communities/1900366536683987325/members'),
  ).toBe('1900366536683987325')
  expect(
    getCommunityId('https://x.com/i/communities/1900366536683987325'),
  ).toBe('1900366536683987325')
  expect(
    getCommunityId('https://x.com/i/communities/1900366536683987325/'),
  ).toBe('1900366536683987325')
})
