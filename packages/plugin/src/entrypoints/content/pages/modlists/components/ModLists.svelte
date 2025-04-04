<script lang="ts">
  import { QueryError, QueryLoading } from '$lib/components/logic/query'
  import { Card } from '$lib/components/ui/card'
  import * as Avatar from '$lib/components/ui/avatar'
  import type { QueryObserverResult } from '@tanstack/svelte-query'
  import type { ModListSubscribeResponse } from '@mass-block-twitter/server'
  import { navigate } from '$lib/components/logic/router'
  import { t } from '$lib/i18n';

  const {
    query,
  }: {
    query: QueryObserverResult<ModListSubscribeResponse>
  } = $props()

  function onGotoDetail(id: string) {
    navigate(`/modlists/detail?id=${id}`)
  }
</script>

<div class="py-4">
  {#if query.isLoading}
    <QueryLoading />
  {:else if query.error}
    <QueryError description={query.error.message} />
  {:else if query.data?.length === 0}
    <p class="text-muted-foreground">{$t('modlists.subscribed.noSubscribed')}</p>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each query.data ?? [] as list (list.id)}
        <Card
          class="p-4 
        hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800
        focus:shadow-lg focus:bg-gray-50 dark:focus:bg-gray-800
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
        transition-all duration-200 cursor-pointer"
          onclick={() => onGotoDetail(list.id)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onGotoDetail(list.id)
            }
          }}
          tabindex={0}
        >
          <div class="flex items-start space-x-4">
            <Avatar.Root class="h-12 w-12">
              <Avatar.Image src={list.avatar} alt={list.name} />
              <Avatar.Fallback>{list.name.substring(0, 2)}</Avatar.Fallback>
            </Avatar.Root>

            <div class="flex-1">
              <h3 class="font-semibold text-lg text-foreground">
                {list.name}
              </h3>
              <p class="text-sm text-muted-foreground mt-1 break-all">
                {list.description}
              </p>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>
