<script lang="ts">
  import { useRoute } from '$lib/components/logic/router'
  import { createMutation, createQuery } from '@tanstack/svelte-query'
  import type {
    ModListGetResponse,
    ModListRemoveErrorResponse,
    ModListSubscribeRequest,
    ModListSubscribeResponse,
    ModListUpdateRequest,
  } from '@mass-block-twitter/server'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import {
    BanIcon,
    EllipsisIcon,
    ImportIcon,
    ListFilterPlusIcon,
    MessageCircleOffIcon,
    PencilIcon,
    ShareIcon,
    Trash2Icon,
    UserPlusIcon,
  } from 'lucide-svelte'
  import { shadcnConfig } from '$lib/components/logic/config'
  import { getAuthInfo, useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import ModlistDesc from './components/ModlistDesc.svelte'
  import { QueryError, QueryLoading } from '$lib/components/logic/query'
  import { SERVER_URL } from '$lib/constants'
  import ModListEdit from '../components/ModListEdit.svelte'
  import { toast } from 'svelte-sonner'
  import { goBack } from '$lib/components/logic/router/route.svelte'
  import { refreshModListSubscribedUsers } from '$lib/content'
  import { crossFetch } from '$lib/query'
  import * as Tabs from '$lib/components/ui/tabs'
  import ModlistUsers from './components/ModlistUsers.svelte'
  import ModlistRules from './components/ModlistRules.svelte'
  import { cn } from '$lib/utils'
  import { dbApi, type User } from '$lib/db'
  import { batchBlockUsers, blockUser, ExpectedError } from '$lib/api'
  import ms from 'ms'
  import { ulid } from 'ulidx'
  import { useModlistUsers } from './utils/useModlistUsers'

  const route = useRoute()
  console.log('[route] ', $state.snapshot(route))
  $inspect('route', route)

  let controller = $state<AbortController>(new AbortController())
  onDestroy(() => {
    controller.abort()
  })
  const metadata = createQuery({
    queryKey: ['modlistMetadata', route.search?.get('id')],
    queryFn: async () => {
      const modListId = route.search?.get('id')
      if (!modListId) {
        return
      }
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/get/${modListId}`,
        {
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      return (await resp.json()) as ModListGetResponse
    },
  })
  const query = useModlistUsers(route.search?.get('id')!)
  const users = $derived.by(() =>
    ($query.data?.pages.flatMap((it) => it.data) ?? []).map(
      (it) =>
        ({
          id: it.id,
          screen_name: it.screenName,
          name: it.name,
          description: it.description,
          profile_image_url: it.profileImageUrl,
        }) as User,
    ),
  )
  const batchBlockMutation = createMutation({
    mutationFn: async () => {
      controller.abort()
      controller = new AbortController()
      const toastId = toast.loading('Blocking users...', {
        action: {
          label: 'Stop',
          onClick: () => {
            controller.abort()
            toast.dismiss(toastId)
          },
        },
      })
      console.log('[batchBlockMutation] startTime ' + new Date().toISOString())
      let errorToastId = ulid()
      try {
        let lastBlockedIndex = 0
        let realBlockedCount = 1
        const MAX_BLOCK_COUNT = 100
        await batchBlockUsers(() => users, {
          signal: controller.signal,
          blockUser: async (user) => {
            const _user = await dbApi.users.get(user.id)
            if (_user && (_user.following || _user.blocking)) {
              return 'skip'
            }
            await blockUser(user)
            realBlockedCount++
          },
          onProcessed: async (user, meta) => {
            const allCount = $metadata.data?.userCount ?? users.length
            // 每 150 个用户等待 5 分钟
            if (realBlockedCount % 150 === 0) {
              toast.loading(
                `Blocked ${user.screen_name} (${meta.index}/${allCount})`,
                {
                  id: toastId,
                  description: `Twitter API rate limit exceeded, please wait 5 minutes...`,
                },
              )
              let now = Date.now()
              const waitTime = 5 * 60 * 1000
              await new Promise<void>((resolve) => {
                const interval = setInterval(() => {
                  toast.loading(
                    `Blocked ${user.screen_name} (${meta.index}/${allCount})`,
                    {
                      id: toastId,
                      description: `Twitter API rate limit exceeded, please wait ${ms(
                        waitTime - (Date.now() - now),
                      )}...`,
                    },
                  )
                }, 1000)
                const abortListener = () => {
                  clearInterval(interval)
                  clearTimeout(timer)
                  resolve()
                }
                const timer = setTimeout(() => {
                  abortListener()
                  controller.signal.removeEventListener('abort', abortListener)
                }, waitTime)
                controller.signal.addEventListener('abort', abortListener)
              })
            }
            console.log(
              `[batchBlockMutation] onProcesssed ${meta.index} ${user.screen_name} ` +
                new Date().toISOString(),
            )
            toast.loading(
              `Blocked ${user.screen_name} (${meta.index}/${allCount})`,
              {
                id: toastId,
                description: `Wait ${ms(meta.averageTime * (allCount - meta.index))}`,
              },
            )
            if (meta.error) {
              if (meta.error instanceof ExpectedError) {
                if (meta.error.code === 'rateLimit') {
                  toast.error(
                    'Twitter API rate limit exceeded, please try again later',
                  )
                  controller.abort()
                  return
                }
                if (meta.error.code === 'forbidden') {
                  toast.error('Forbidden, please try again later', {
                    duration: 1000000,
                    action: {
                      label: 'Refresh',
                      onClick: () => {
                        location.reload()
                      },
                    },
                  })
                  controller.abort()
                  return
                }
                if (meta.error.code === 'unauthorized') {
                  toast.error('Unauthorized, please login again', {
                    duration: 1000000,
                    action: {
                      label: 'Refresh',
                      onClick: () => {
                        location.reload()
                      },
                    },
                  })
                  controller.abort()
                  return
                }
                if (meta.error.code === 'notFound') {
                  toast.error(`User ${user.screen_name} not found`, {
                    id: errorToastId,
                  })
                  return
                }
              }
              toast.error(`User ${user.screen_name} block failed.`)
              return
            }
            if (meta.result !== 'skip') {
              await dbApi.users.block(user)
              await dbApi.activitys.record([
                {
                  id: ulid().toString(),
                  action: 'block',
                  trigger_type: 'manual',
                  match_type: 'user',
                  match_filter: 'modList',
                  user_id: user.id,
                  user_name: user.name,
                  user_screen_name: user.screen_name,
                  user_profile_image_url: user.profile_image_url,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ])
            }
            lastBlockedIndex = meta.index
            if (meta.index % 10 === 0) {
              await $query.fetchNextPage()
            }
            // if not pro user and blocked users >= 100, abort
            if (lastBlockedIndex >= MAX_BLOCK_COUNT && !authInfo.value?.isPro) {
              controller.abort()
            }
          },
        })

        if (!authInfo.value?.isPro && lastBlockedIndex >= MAX_BLOCK_COUNT) {
          toast.info('You have reached the maximum number of blocked users.', {
            description: `${lastBlockedIndex}/${$metadata.data?.userCount ?? users.length} users blocked, please upgrade to Pro to block unlimited users.`,
            action: {
              label: 'Upgrade Now',
              onClick: () => {
                window.open('https://mass-block-twitter.rxliuli.com/pricing')
              },
            },
          })
        } else {
          toast.success('Blocked users', {
            description: `${lastBlockedIndex}/${$metadata.data?.userCount ?? users.length} users blocked`,
          })
        }
      } catch (err) {
        toast.error('Block users failed')
      } finally {
        toast.dismiss(toastId)
      }
    },
  })

  const subscribeMutation = createMutation({
    mutationFn: async (action: ModListSubscribeRequest['action']) => {
      const authInfo = await getAuthInfo()
      if (!authInfo?.isPro) {
        const subscribed = (await (
          await crossFetch(`${SERVER_URL}/api/modlists/subscribed/metadata`, {
            headers: {
              Authorization: `Bearer ${authInfo?.token}`,
            },
          })
        ).json()) as ModListSubscribeResponse
        if (subscribed.length >= 3) {
          toast.info('You have reached the maximum number of subscribed.', {
            description:
              'Please upgrade to Pro to create unlimited subscribed.',
            action: {
              label: 'Upgrade Now',
              onClick: () => {
                window.open('https://mass-block-twitter.rxliuli.com/pricing')
              },
            },
          })
        }
      }
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/subscribe/${route.search?.get('id')}`,
        {
          method: 'POST',
          body: JSON.stringify({ action } satisfies ModListSubscribeRequest),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: async (_data, action) => {
      await $metadata.refetch()
      refreshModListSubscribedUsers(true)
      if (action === 'block') {
        const toastId = toast.success('Subscribe modlist success', {
          description: 'Do you want to block all accounts now?',
          action: {
            label: 'Block now',
            onClick: () => {
              toast.dismiss(toastId)
              $batchBlockMutation.mutate()
            },
          },
          cancel: {
            label: 'Later',
            onClick: () => {
              toast.dismiss(toastId)
            },
          },
        })
      }
    },
    onError: () => {
      toast.error('Subscribe modlist failed')
    },
  })
  const unsubscribeMutation = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/subscribe/${route.search?.get('id')}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: async () => {
      await $metadata.refetch()
      refreshModListSubscribedUsers(true)
    },
    onError: async (error) => {
      toast.error('Unsubscribe modlist failed')
    },
  })
  const deleteMutation = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/remove/${route.search?.get('id')}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: async () => {
      toast.success('Delete modlist success')
      goBack()
    },
    onError: async (error) => {
      if (error instanceof Response) {
        const data = (await error.json()) as ModListRemoveErrorResponse
        if (data.code === 'modListNotFound') {
          toast.error('Modlist not found')
          return
        }
        if (data.code === 'modListHasSubscriptions') {
          toast.error('Modlist has subscriptions')
          return
        }
      }
      toast.error('Delete modlist failed')
    },
  })
  let metadataEditOpen = $state(false)
  function onOpenEdit() {
    metadataEditOpen = true
  }
  const updateModlist = createMutation({
    mutationFn: async (modlist: Omit<ModListUpdateRequest, 'twitterUser'>) => {
      const authInfo = await getAuthInfo()
      const resp = await crossFetch(
        `${SERVER_URL}/api/modlists/update/${route.search?.get('id')}`,
        {
          method: 'PUT',
          body: JSON.stringify(modlist satisfies ModListUpdateRequest),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authInfo?.token}`,
          },
        },
      )
      if (!resp.ok) {
        throw resp
      }
    },
    onSuccess: async () => {
      toast.success('Update modlist success')
      await $metadata.refetch()
    },
    onError: () => {
      toast.error('Update modlist failed')
    },
  })
  const authInfo = useAuthInfo()

  let currentTab = $state<'users' | 'rules'>('users')
  let usersRef = $state<{
    onOpenUserAdd: () => void
    onImportUsers: () => void
  }>()
  let rulesRef = $state<{
    onOpenRuleEdit: () => void
  }>()

  function onCopyLink() {
    const url = `https://mass-block-twitter.rxliuli.com/modlist/${route.search?.get('id')}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard', {
      description: url,
    })
  }
</script>

<LayoutNav title="Moderation Lists Detail">
  {#if $metadata.data?.subscribed}
    <Button
      variant="outline"
      onclick={() => $unsubscribeMutation.mutate()}
      disabled={!authInfo.value || $unsubscribeMutation.isPending}
    >
      {$metadata.data.action === 'block' ? 'Unblock' : 'Unmute'}
    </Button>
  {:else}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={!authInfo.value || $subscribeMutation.isPending}
      >
        Subscribe
      </DropdownMenu.Trigger>
      <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
        <DropdownMenu.Item onclick={() => $subscribeMutation.mutate('hide')}>
          Mute accounts <MessageCircleOffIcon class="w-4 h-4" />
        </DropdownMenu.Item>
        <DropdownMenu.Item onclick={() => $subscribeMutation.mutate('block')}>
          Block accounts <BanIcon class="w-4 h-4" />
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Button variant="ghost" size="icon">
        <EllipsisIcon />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
      <DropdownMenu.Item onclick={onCopyLink}>
        Copy Link to list
        <DropdownMenu.Shortcut>
          <ShareIcon class="text-blue-500" />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => $batchBlockMutation.mutate()}>
        Block users
        <DropdownMenu.Shortcut>
          <BanIcon class="text-red-500" />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
      <DropdownMenu.Item disabled={!$metadata.data?.owner} onclick={onOpenEdit}>
        Edit list details
        <DropdownMenu.Shortcut>
          <PencilIcon class="text-blue-500" />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
      <DropdownMenu.Item
        disabled={!$metadata.data?.owner}
        onclick={() => $deleteMutation.mutate()}
      >
        Delete list
        <DropdownMenu.Shortcut>
          <Trash2Icon class="text-red-500" />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</LayoutNav>

<div class="h-full flex flex-col">
  <div class="w-full max-w-3xl mx-auto">
    {#if $metadata.isLoading}
      <QueryLoading />
    {:else if $metadata.data}
      <ModlistDesc modlist={$metadata.data}>
        {#snippet actions()}
          <div class="flex items-center justify-between">
            <Tabs.Root bind:value={currentTab}>
              <Tabs.List>
                <Tabs.Trigger value="users">Users</Tabs.Trigger>
                <Tabs.Trigger value="rules">Rules</Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
            <div
              class={cn('flex items-center', {
                hidden: currentTab !== 'users',
              })}
            >
              <Button
                variant="ghost"
                class="text-blue-400 flex items-center gap-2"
                onclick={() => usersRef?.onImportUsers()}
                disabled={!$metadata.data?.owner}
              >
                <ImportIcon class="h-4 w-4" />
                Import users
              </Button>
              <Button
                variant="ghost"
                class="text-blue-400 flex items-center gap-2"
                onclick={() => usersRef?.onOpenUserAdd()}
                disabled={!$metadata.data?.owner}
              >
                <UserPlusIcon class="h-4 w-4" />
                Add users
              </Button>
            </div>
            <div
              class={cn('flex items-center', {
                hidden: currentTab !== 'rules',
              })}
            >
              <Button
                variant="ghost"
                class="text-blue-400 flex items-center gap-2"
                onclick={() => rulesRef?.onOpenRuleEdit()}
                disabled={!$metadata.data?.owner}
              >
                <ListFilterPlusIcon class="h-4 w-4" />
                Add rule
              </Button>
            </div>
          </div>
        {/snippet}
      </ModlistDesc>
    {:else}
      <QueryError description={'Load modlist detail failed'} />
    {/if}
  </div>

  {#if currentTab === 'users'}
    <ModlistUsers owner={!!$metadata.data?.owner} bind:ref={usersRef} />
  {:else}
    <ModlistRules owner={!!$metadata.data?.owner} bind:ref={rulesRef} />
  {/if}
</div>

<ModListEdit
  bind:open={metadataEditOpen}
  title="Edit Moderation List"
  data={$metadata.data!}
  onSave={$updateModlist.mutateAsync}
/>
