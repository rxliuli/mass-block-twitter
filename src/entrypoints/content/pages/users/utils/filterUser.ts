import { User } from '$lib/db'
import { matchByKeyword } from '$lib/util/matchByKeyword'

export type SearchParams = {
  keyword: string
  filterBlocked: 'all' | 'blocked' | 'unblocked'
  filterVerified: 'all' | 'verified' | 'unverified'
  filterFollowed: 'all' | 'followed' | 'unfollowed'
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
  if (searchParams.filterBlocked === 'blocked' && !user.blocking) {
    return false
  }
  if (searchParams.filterBlocked === 'unblocked' && user.blocking) {
    return false
  }
  if (searchParams.filterFollowed === 'followed' && !user.following) {
    return false
  }
  if (searchParams.filterFollowed === 'unfollowed' && user.following) {
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
