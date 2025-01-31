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
      keyword: '',
      showBlocking: false,
      showFollowing: false,
    })
    expect(result).true
  })
  it('should return true when keyword is match', () => {
    const result = filterUser(user, {
      keyword: 'test',
      showBlocking: false,
      showFollowing: false,
    })
    expect(result).true
  })
  it('should return false when keyword is not match', () => {
    const result = filterUser(user, {
      keyword: 'test1',
      showBlocking: false,
      showFollowing: false,
    })
    expect(result).false
  })
  it('should return false when showBlocking is false and user is blocking', () => {
    user.blocking = true
    const result = filterUser(user, {
      keyword: '',
      showBlocking: false,
      showFollowing: false,
    })
    expect(result).false
  })
  it('should return true when showBlocking is true and user is blocking', () => {
    user.blocking = true
    const result = filterUser(user, {
      keyword: '',
      showBlocking: true,
      showFollowing: false,
    })
    expect(result).true
  })
  it('should return false when showFollowing is false and user is following', () => {
    user.following = true
    const result = filterUser(user, {
      keyword: '',
      showBlocking: false,
      showFollowing: false,
    })
    expect(result).false
  })
  it('should return true when showFollowing is true and user is following', () => {
    user.following = true
    const result = filterUser(user, {
      keyword: '',
      showBlocking: false,
      showFollowing: true,
    })
    expect(result).true
  })
})
