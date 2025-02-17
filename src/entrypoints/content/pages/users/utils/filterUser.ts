import { User } from '$lib/db'
import { matchByKeyword } from '$lib/util/matchByKeyword'

export type SearchParams = {
  keyword: string
  filterBlocking: 'all' | 'blocked' | 'unblocked'
  filterVerified: 'all' | 'verified' | 'unverified'
  filterFollowing: 'all' | 'following' | 'notFollowing'
}

export function filterUser(user: User, searchParams: SearchParams) {
  const trimKeyword = searchParams.keyword.trim()
  if (
    trimKeyword &&
    !matchByKeyword(trimKeyword, [
      user.screen_name,
      user.name,
      user.description,
    ])
  ) {
    return false
  }
  if (searchParams.filterBlocking === 'blocked' && !user.blocking) {
    return false
  }
  if (searchParams.filterBlocking === 'unblocked' && user.blocking) {
    return false
  }
  if (searchParams.filterFollowing === 'following' && !user.following) {
    return false
  }
  if (searchParams.filterFollowing === 'notFollowing' && user.following) {
    return false
  }
  if (searchParams.filterVerified === 'verified' && !user.is_blue_verified) {
    return false
  }
  if (searchParams.filterVerified === 'unverified' && user.is_blue_verified) {
    return false
  }
  return true
}
