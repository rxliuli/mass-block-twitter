import { User } from '$lib/db'
import { matchByKeyword } from '$lib/util/matchByKeyword'

type SearchParams = {
  keyword: string
  showBlocking: boolean
  showFollowing: boolean
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
  if (!searchParams.showBlocking && user.blocking) {
    return false
  }
  if (!searchParams.showFollowing && user.following) {
    return false
  }
  return true
}
