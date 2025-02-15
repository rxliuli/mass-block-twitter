<script lang="ts">
  import { List } from '$lib'
  import { faker } from '@faker-js/faker'
  import type { UIEventHandler } from 'svelte/elements'
  import { createInfiniteQuery } from '@tanstack/svelte-query'
  import { last } from 'lodash-es'

  const query = createInfiniteQuery({
    queryKey: ['infinite-list'],
    queryFn: async ({ pageParam = 0 }) => {
      const data = Array.from({ length: 50 }, () => ({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
      }))
      return {
        data,
        cursor: last(data)?.id,
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: null as string | null,
  })

  const handleScroll: UIEventHandler<HTMLElement> = (event) => {
    const target = event.target as HTMLElement
    const scrollTop = target.scrollTop
    const clientHeight = target.clientHeight
    const scrollHeight = target.scrollHeight
    if (Math.abs(scrollHeight - scrollTop - clientHeight) <= 1) {
      $query.fetchNextPage()
    }
  }
</script>

{#if $query.data}
  <List
    data={$query.data.pages.flatMap((page) => page.data)}
    itemKey="id"
    itemHeight={20}
    height={400}
    onscroll={handleScroll}
  >
    {#snippet child(item)}
      <div class="flex items-center gap-2">
        <div class="text-sm font-medium">{item.name}</div>
        <div class="text-sm text-gray-500">{item.email}</div>
      </div>
    {/snippet}
  </List>
{/if}
