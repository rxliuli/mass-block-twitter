<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { dbApi } from '$lib/db'
  import { AutoSizer, List } from '@rxliuli/svelte-window'
  import { createInfiniteQuery } from '@tanstack/svelte-query'
  import ActivityItem from './components/ActivityItem.svelte'
  import { t } from '$lib/i18n'

  const query = createInfiniteQuery({
    queryKey: ['activities'],
    queryFn: ({ pageParam }) =>
      dbApi.activitys.getByPage({ limit: 20, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined as string | undefined,
  })

  const activities = $derived(
    $query.data?.pages.flatMap((page) => page.data) ?? [],
  )

  function onScroll(ev: Event) {
    const { scrollTop, scrollHeight, clientHeight } = ev.target as HTMLElement
    if (scrollTop + clientHeight + 1 >= scrollHeight) {
      if ($query.hasNextPage && !$query.isPending) {
        $query.fetchNextPage()
      }
    }
  }
</script>

<LayoutNav title={$t('dashboard.recentActivities.title')} />

{#if $query.error}
  <div class="flex items-center justify-center h-full">
    <p class="text-red-500">{$t('common.error')}: {$query.error.message}</p>
  </div>
{/if}

<AutoSizer>
  {#snippet child({ height })}
    <List
      {height}
      data={activities}
      itemKey={'id'}
      itemHeight={82}
      class="divide-y"
      onscroll={onScroll}
      dynamic
    >
      {#snippet child(activity)}
        <ActivityItem {activity} />
      {/snippet}
    </List>
  {/snippet}
</AutoSizer>
