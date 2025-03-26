<script lang="ts">
  import { createInfiniteQuery } from '@tanstack/svelte-query'
  import { onMount } from 'svelte'

  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const query = createInfiniteQuery({
    queryKey: ['test'],
    queryFn: async ({ pageParam }) => {
      return {
        cursor: pageParam === data.length - 1 ? undefined : pageParam + 1,
        data: [data[pageParam]],
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: 0,
  })

  onMount(async () => {
    while ($query.hasNextPage) {
      await $query.fetchNextPage()
    }
  })
</script>

<div>{$query.hasNextPage}</div>

<div>
  {JSON.stringify($query.data?.pages.flatMap((it) => it.data) ?? [])}
</div>
