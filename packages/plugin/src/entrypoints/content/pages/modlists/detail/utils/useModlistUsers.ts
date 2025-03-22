import { useRoute } from "$lib/components/logic/router"
import { SERVER_URL } from "$lib/constants"
import { getAuthInfo } from "$lib/hooks/useAuthInfo.svelte"
import { crossFetch } from "$lib/query"
import { ModListUsersPageResponse } from "@mass-block-twitter/server"
import { createInfiniteQuery } from "@tanstack/svelte-query"

export function useModlistUsers(modListId: string, searchQuery?: string) {
  const query = createInfiniteQuery({
    queryKey: ['modlistUsers', modListId, searchQuery],
    queryFn: async ({ pageParam }) => {
      const authInfo = await getAuthInfo()
      const url = new URL(`${SERVER_URL}/api/modlists/users`)
      url.searchParams.set('modListId', modListId)
      if (searchQuery) {
        url.searchParams.set('query', searchQuery)
      }
      if (pageParam) {
        url.searchParams.set('cursor', pageParam)
      }
      const resp = await crossFetch(url, {
        headers: { Authorization: `Bearer ${authInfo?.token}` },
      })
      return (await resp.json()) as ModListUsersPageResponse
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined as string | undefined,
  })
  return query
}
