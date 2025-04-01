<script lang="ts">
  import {
    QueryError,
    QueryLoading,
    useScroll,
  } from '$lib/components/logic/query'
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
  import { PencilIcon, Proportions, Trash2Icon } from 'lucide-svelte'
  import { cn } from '$lib/utils'
  import ModlistRulePreview from './ModlistRulePreview.svelte'
  import { t } from '$lib/i18n'
  import { refreshModListSubscribedUsers } from '$lib/content'

  let {
    owner,
    subscribed,
    ref = $bindable(),
  }: {
    owner: boolean
    subscribed: boolean
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
  const { onScroll } = useScroll(() => $query)

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
        toast.info($t('modlists.detail.rules.limit.reached'), {
          description: $t('modlists.detail.rules.limit.upgrade'),
          action: {
            label: $t('modlists.detail.rules.limit.upgrade.action'),
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
      toast.success($t('modlists.detail.rules.add.success'))
      ruleEditOpen = false
      rule = createRule()
      if (subscribed) {
        refreshModListSubscribedUsers(true)
      }
    },
    onError: (error) => {
      console.error('Failed to add rule', error)
      toast.error($t('modlists.detail.rules.add.failed'))
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
      toast.success($t('modlists.detail.rules.update.success'))
      ruleEditOpen = false
      rule = createRule()
      if (subscribed) {
        refreshModListSubscribedUsers(true)
      }
    },
    onError: (error) => {
      console.error('Failed to update rule', error)
      toast.error($t('modlists.detail.rules.update.failed'))
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
      toast.success($t('modlists.detail.rules.remove.success'))
      if (subscribed) {
        refreshModListSubscribedUsers(true)
      }
    },
    onError: () => {
      toast.error($t('modlists.detail.rules.remove.failed'))
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
            <div class="text-center text-zinc-400">
              {$t('modlists.detail.rules.empty')}
            </div>
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
      {:else if $query.isError}
        <QueryError />
      {:else}
        <QueryLoading />
      {/if}
    {/snippet}
  </AutoSizer>
</div>

<ModlistRuleEdit
  bind:open={ruleEditOpen}
  bind:rule
  onSave={rule.id ? $updateRule.mutate : $addRule.mutate}
/>

<ModlistRulePreview bind:open={previewRuleOpen} rule={previewRule} />
