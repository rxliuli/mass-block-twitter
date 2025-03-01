import { User } from '$lib/db'
import { beforeEach, describe, expect, it } from 'vitest'
import { filterUser } from '../filterUser'

describe('should filter user', () => {
  let user: User
  beforeEach(() => {
    user = {
      id: '1',
      screen_name: 'test',
      name: 'test',
      description: 'test',
      blocking: false,
      following: false,
      updated_at: new Date().toISOString(),
    }
  })
  it('should return true when keyword is empty', () => {
    const result = filterUser(user, {
      filterBlocked: 'all',
      filterVerified: 'all',
      filterFollowed: 'all',
    })
    expect(result).true
  })
  it('should return false when showBlocking is false and user is blocking', () => {
    user.blocking = true
    const result = filterUser(user, {
      filterBlocked: 'unblocked',
      filterVerified: 'all',
      filterFollowed: 'all',
    })
    expect(result).false
  })
  it('should return true when showBlocking is true and user is blocking', () => {
    user.blocking = true
    const result = filterUser(user, {
      filterBlocked: 'blocked',
      filterVerified: 'all',
      filterFollowed: 'all',
    })
    expect(result).true
  })
  it('should return false when showFollowing is false and user is following', () => {
    user.following = true
    const result = filterUser(user, {
      filterBlocked: 'unblocked',
      filterVerified: 'all',
      filterFollowed: 'unfollowed',
    })
    expect(result).false
  })
  it('should return true when showFollowing is true and user is following', () => {
    user.following = true
    const result = filterUser(user, {
      filterBlocked: 'unblocked',
      filterVerified: 'all',
      filterFollowed: 'followed',
    })
    expect(result).true
  })
})
