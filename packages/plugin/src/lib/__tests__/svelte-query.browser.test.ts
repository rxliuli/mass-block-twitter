import { batchQuery } from '$lib/util/batch'
import { createInfiniteQuery, QueryClient } from '@tanstack/svelte-query'
import { range } from 'es-toolkit'
import { get } from 'svelte/store'
import { describe, expect, it, vi } from 'vitest'

describe('createInfiniteQuery', () => {
  it('should return true when hasNextPage is true', async () => {
    const data = range(1000)
    const query = createInfiniteQuery(
      {
        queryKey: ['test'],
        queryFn: ({ pageParam }) => {
          const cursor = pageParam + 10
          return {
            data: data.slice(pageParam, cursor),
            cursor: cursor > data.length ? undefined : cursor,
          }
        },
        getNextPageParam: (last) => last.cursor,
        initialPageParam: 0,
      },
      new QueryClient(),
    )
    await get(query).fetchNextPage()
    expect(get(query).data?.pages[0].data).toEqual(range(10))
    while (get(query).hasNextPage) {
      await get(query).fetchNextPage()
    }
    expect(get(query).data?.pages.flatMap((it) => it.data)).toEqual(data)
  })
  it.only('query and batchQuery', async () => {
    const data = range(1000)
    const query = createInfiniteQuery(
      {
        queryKey: ['test'],
        queryFn: ({ pageParam }) => {
          const cursor = pageParam + 10
          return {
            data: data.slice(pageParam, cursor),
            cursor: cursor >= data.length ? undefined : cursor,
          }
        },
        getNextPageParam: (last) => last.cursor,
        initialPageParam: 0,
      },
      new QueryClient(),
    )
    await get(query).fetchNextPage()
    const onProcessed = vi.fn()
    await batchQuery({
      controller: new AbortController(),
      getItems: () => get(query).data?.pages.flatMap((it) => it.data) ?? [],
      hasNext: () => get(query).hasNextPage,
      fetchNextPage: () => get(query).fetchNextPage(),
      onProcessed,
    })
    expect(onProcessed).toHaveBeenCalledTimes(99)
  })
})
