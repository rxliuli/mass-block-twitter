<script lang="ts">
  import { QueryError, QueryLoading } from '$lib/components/logic/query'
  import { useRoute } from '$lib/components/logic/router'
  import { SERVER_URL } from '$lib/constants'
  import { getAuthInfo, useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { crossFetch } from '$lib/query'
  import type {
    ModListRulesPageResponse,
    ModListRule,
    ModListConditionItem,
    ModListAddRuleRequest,
    ModListUpdateRuleRequest,
  } from '@mass-block-twitter/server'
  import { AutoSizer, List } from '@rxliuli/svelte-window'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import ModlistRuleEdit from './ModlistRuleEdit.svelte'
  import { toast } from 'svelte-sonner'
  import { Button } from '$lib/components/ui/button'
  import { PencilIcon, Trash2Icon } from 'lucide-svelte'
  import { cn } from '$lib/utils'
  import ModlistRulePreview from './ModlistRulePreview.svelte'

  let {
    owner,
    ref = $bindable(),
  }: {
    owner: boolean
    ref?: { onOpenRuleEdit: () => void }
  } = $props()

  ref = {
    onOpenRuleEdit: onOpenAddRuleEdit,
  }

  const route = useRoute()

  const query = createInfiniteQuery({
    queryKey: ['modlistRules', route.search?.get('id')],
    queryFn: async ({ pageParam }) => {
      const authInfo = await getAuthInfo()
      const url = new URL(`${SERVER_URL}/api/modlists/rules`)
      url.searchParams.set('modListId', route.search?.get('id')!)
      if (pageParam) {
        url.searchParams.set('cursor', pageParam)
      }
      const resp = await crossFetch(url, {
        headers: { Authorization: `Bearer ${authInfo?.token}` },
      })
      return (await resp.json()) as ModListRulesPageResponse
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
    initialPageParam: undefined as string | undefined,
  })
  function onScroll(event: UIEvent) {
    const target = event.target as HTMLElement
    const scrollTop = target.scrollTop
    const clientHeight = target.clientHeight
    const scrollHeight = target.scrollHeight
    if (Math.abs(scrollHeight - scrollTop - clientHeight) <= 1) {
      requestAnimationFrame(() => {
        if ($query.hasNextPage) {
          $query.fetchNextPage()
        }
      })
    }
  }
  let ruleEditOpen = $state(false)
  const createRule = () =>
    ({
      name: '',
      rule: {
        or: [
          {
            and: [{} as ModListConditionItem],
          },
        ],
      },
      modListId: route.search?.get('id')!,
    }) satisfies ModListAddRuleRequest
  let rule = $state<
    ModListAddRuleRequest & {
      id?: string
    }
  >(createRule())
  const authInfo = useAuthInfo()
  function onOpenAddRuleEdit() {
    if (!authInfo.value?.isPro) {
      if (($query.data?.pages.flatMap((it) => it.data) ?? []).length >= 10) {
        toast.info('You have reached the maximum number of rules.', {
          description: 'Please upgrade to Pro to create unlimited rules.',
          action: {
            label: 'Upgrade Now',
            onClick: () => {
              window.open('https://mass-block-twitter.rxliuli.com/pricing')
            },
          },
        })
        return
      }
    }
    ruleEditOpen = true
    rule = createRule()
  }

  const addRule = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/rule`, {
        headers: {
          Authorization: `Bearer ${authInfo?.token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          modListId: route.search?.get('id')!,
          rule: rule.rule,
          name: rule.name,
        } satisfies ModListAddRuleRequest),
      })
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: () => {
      $query.refetch()
      toast.success('Rule added')
      ruleEditOpen = false
      rule = createRule()
    },
    onError: (error) => {
      console.error('Failed to add rule', error)
      toast.error('Failed to add rule')
    },
  })
  const updateRule = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/rule/${rule.id}`,
        {
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
            'Content-Type': 'application/json',
          },
          method: 'PUT',
          body: JSON.stringify({
            rule: rule.rule,
            name: rule.name,
          } satisfies ModListUpdateRuleRequest),
        },
      )
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: () => {
      $query.refetch()
      toast.success('Rule updated')
      ruleEditOpen = false
      rule = createRule()
    },
    onError: (error) => {
      console.error('Failed to update rule', error)
      toast.error('Failed to update rule')
    },
  })
  const removeRule = createMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(`${SERVER_URL}/api/modlists/rule/${id}`, {
        headers: { Authorization: `Bearer ${authInfo?.token}` },
        method: 'DELETE',
      })
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: () => {
      $query.refetch()
      toast.success('Rule removed')
    },
    onError: () => {
      toast.error('Failed to remove rule')
    },
  })
  function onOpenUpdateRuleEdit(item: ModListRule) {
    ruleEditOpen = true
    rule = $state.snapshot(item)
  }

  let previewRuleOpen = $state(false)
  let previewRule = $state<ModListRule>()
  function onPreviewRule(item: ModListRule) {
    previewRule = $state.snapshot(item)
    previewRuleOpen = true
  }
</script>

<div class="flex-1 overflow-y-hidden">
  <AutoSizer>
    {#snippet child({ height })}
      {#if $query.data}
        {@const users = $query.data.pages.flatMap((it) => it.data) ?? []}
        {#if users.length === 0}
          {#if !$query.isFetching}
            <div class="text-center text-zinc-400">No rules in this list</div>
          {/if}
        {:else}
          <List
            data={users}
            itemKey="id"
            itemHeight={45}
            {height}
            dynamic
            onscroll={onScroll}
          >
            {#snippet child(item)}
              <div
                class={cn(
                  'flex py-1 h-12 rounded-md items-center justify-between gap-2 hover:bg-accent hover:text-accent-foreground max-w-3xl mx-auto',
                )}
                role="button"
                tabindex="0"
                onclick={() =>
                  owner ? onOpenUpdateRuleEdit(item) : onPreviewRule(item)}
                onkeydown={(e) =>
                  e.key === 'Enter' &&
                  (owner ? onOpenUpdateRuleEdit(item) : onPreviewRule(item))}
              >
                <div class="flex-1 truncate text-sm font-medium">
                  {item.name}
                </div>
                {#if owner}
                  <Button
                    size="icon"
                    onclick={(ev) => {
                      ev.stopPropagation()
                      onOpenUpdateRuleEdit(item)
                    }}
                  >
                    <PencilIcon class="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    onclick={(ev) => {
                      ev.stopPropagation()
                      $removeRule.mutate({
                        id: item.id,
                      })
                    }}
                  >
                    <Trash2Icon class="h-4 w-4" />
                  </Button>
                {/if}
              </div>
            {/snippet}
          </List>
        {/if}
      {/if}
    {/snippet}
  </AutoSizer>
  <div class="sticky bottom-0">
    {#if $query.isFetching}
      <QueryLoading class="h-auto" />
    {:else if $query.error}
      <QueryError description={'Load modlist rules failed'} />
    {/if}
  </div>
</div>

<ModlistRuleEdit
  bind:open={ruleEditOpen}
  bind:rule
  onSave={rule.id ? $updateRule.mutate : $addRule.mutate}
/>

<ModlistRulePreview bind:open={previewRuleOpen} rule={previewRule} />
