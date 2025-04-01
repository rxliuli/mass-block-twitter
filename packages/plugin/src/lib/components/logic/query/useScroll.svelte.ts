import { InfiniteQueryObserverResult } from '@tanstack/svelte-query'

// TODO: fuck of svelte5 runes
export function useScroll(_query: () => InfiniteQueryObserverResult) {
  const query = $derived.by(_query)
  async function onScroll(event: UIEvent) {
    const target = event.target as HTMLElement
    const scrollTop = target.scrollTop
    const clientHeight = target.clientHeight
    const scrollHeight = target.scrollHeight
    if (
      Math.abs(scrollHeight - scrollTop - clientHeight) <=
      window.innerHeight / 2
    ) {
      if (query.hasNextPage && !query.isFetching) {
        await query.fetchNextPage()
      }
    }
  }
  return {
    onScroll,
  }
}
