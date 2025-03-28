<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { ADataTable } from '$lib/components/logic/a-data-table'
  import { dbApi, type User } from '$lib/db'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { userColumns } from '../utils/columns'
  import Button from '$lib/components/ui/button/button.svelte'
  import { DownloadIcon, ShieldCheckIcon } from 'lucide-svelte'
  import { toast } from 'svelte-sonner'
  import { serializeError } from 'serialize-error'
  import { blockUser, unblockUser } from '$lib/api'
  import { ulid } from 'ulidx'
  import { t, tP } from '$lib/i18n'
  import { getBlockedUsers } from '$lib/api/twitter'
  import { generateCSV } from '$lib/util/csv'
  import saveAs from 'file-saver'

  const query = createInfiniteQuery({
    queryKey: ['blocked-users'],
    queryFn: async ({ pageParam }) => {
      const r = await getBlockedUsers({
        cursor: pageParam,
        count: 20,
      })
      // const r = await dbApi.users.getByPage({
      //   limit: 100,
      //   cursor: pageParam,
      // })
      return r
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
  })

  onMount(async () => {
    await $query.fetchNextPage()
    await $query.fetchNextPage()
  })

  let selectedRowKeys = $state<string[]>([])
  async function onScroll(event: UIEvent) {
    const target = event.target as HTMLElement
    const scrollTop = target.scrollTop
    const clientHeight = target.clientHeight
    const scrollHeight = target.scrollHeight
    if (
      Math.abs(scrollHeight - scrollTop - clientHeight) <=
      window.innerHeight / 2
    ) {
      if ($query.hasNextPage && !$query.isFetchingNextPage) {
        await $query.fetchNextPage()
        await $query.fetchNextPage()
        await $query.fetchNextPage()
      }
    }
  }

  const unblockMutation = createMutation({
    mutationFn: async ({
      users,
      action,
    }: {
      users: User[]
      action: 'block' | 'unblock'
    }) => {
      let failedNames: string[] = []
      const loadingId = toast.loading(
        action === 'block'
          ? $t('blocked-users.toast.blocking')
          : $t('blocked-users.toast.unblocking'),
      )
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        const blockingText =
          action === 'block'
            ? $t('blocked-users.toast.blocking')
            : $t('blocked-users.toast.unblocking')
        try {
          toast.loading(
            $t('blocked-users.toast.blockingProgress', {
              values: {
                current: i + 1,
                total: users.length,
                action: blockingText,
                name: it.name,
              },
            }),
            { id: loadingId },
          )
          if (action === 'block') {
            await blockUser(it)
            await dbApi.users.block(it)
            await dbApi.activitys.record([
              {
                id: ulid().toString(),
                action: 'block',
                trigger_type: 'manual',
                match_type: 'user',
                match_filter: 'batchSelected',
                user_id: it.id,
                user_name: it.name,
                user_screen_name: it.screen_name,
                user_profile_image_url: it.profile_image_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
          } else {
            await unblockUser(it.id)
            await dbApi.users.unblock(it)
          }
        } catch (e) {
          failedNames.push(it.name)
          console.log(`${blockingText} ${it.id} ${it.name} failed`, e)
          toast.error(
            $t('blocked-users.toast.blockingFailed', {
              values: {
                current: i + 1,
                total: users.length,
                action: blockingText,
                name: it.name,
              },
            }),
            {
              description: serializeError(e).message,
            },
          )
        }
      }
      toast.dismiss(loadingId)
      toast.success(
        $t('blocked-users.toast.blockingSuccess', {
          values: {
            success: users.length - failedNames.length,
            failed: failedNames.length,
            action:
              action === 'block'
                ? $t('search-and-block.filter.blocking.blocked')
                : $t('search-and-block.filter.blocking.unblocked'),
          },
        }),
        {
          description: failedNames.join(', '),
          duration: 5000,
        },
      )
    },
    onSuccess: async () => {
      await $query.refetch()
      selectedRowKeys = []
    },
  })

  async function onUnblock() {
    const users =
      $query.data?.pages
        .flatMap((it) => it.data)
        .filter((it) => selectedRowKeys.includes(it.id)) ?? []
    if (users.length === 0) {
      toast.error($t('blocked-users.toast.noSelection'))
      return
    }
    await $unblockMutation.mutateAsync({ users, action: 'unblock' })
  }

  const columns = $derived(
    userColumns.map((it) => ({
      ...it,
      title: $t(it.title),
    })),
  )

  const MAX_REQUESTS = 850
  let controller = $state(new AbortController())
  onDestroy(() => {
    controller.abort()
  })
  const getUsers = () => $query.data?.pages.flatMap((it) => it.data) ?? []
  const exportMutation = createMutation({
    mutationFn: async () => {
      controller.abort()
      controller = new AbortController()
      const toastId = toast.info('Exporting...', {
        description: `Exporting ${getUsers().length} blocked users`,
        duration: 1000000,
        cancel: {
          label: 'Stop',
          onClick: () => {
            controller.abort()
            toast.dismiss(toastId)
          },
        },
      })
      try {
        let i = 0
        while ($query.hasNextPage && !controller.signal.aborted) {
          try {
            await $query.fetchNextPage()
          } catch (e) {
            console.error('exportBlockedUsers failed', e)
            toast.error('Save failed, please try again later')
            break
          }
          i++
          toast.info(`Exporting...`, {
            id: toastId,
            description: `Exporting ${getUsers().length} blocked users`,
            cancel: {
              label: 'Stop',
              onClick: () => {
                controller.abort()
                toast.dismiss(toastId)
              },
            },
          })
          if (i >= MAX_REQUESTS) {
            const r = await new Promise<'stop' | 'continue'>((resolve) => {
              toast.info(
                `You have reached the maximum number of requests, do you want to continue?`,
                {
                  id: toastId,
                  duration: 1000000,
                  cancel: {
                    label: 'Stop',
                    onClick: () => {
                      controller.abort()
                      resolve('stop')
                    },
                  },
                  action: {
                    label: 'Continue',
                    onClick: () => {
                      resolve('continue')
                    },
                  },
                },
              )
            })
            if (r === 'stop') {
              break
            }
          }
        }
        toast.success('Export success', {
          duration: 1000000,
          description: `Exported ${getUsers().length} blocked users`,
          cancel: undefined,
          action: {
            label: 'Download',
            onClick: () => {
              const users = getUsers()
              const csv = generateCSV(users, {
                fields: [
                  'id',
                  'screen_name',
                  'name',
                  'description',
                  'profile_image_url',
                ],
              })
              saveAs(
                new Blob([csv]),
                `blocked_users_${new Date().toISOString()}.csv`,
              )
              toast.dismiss(toastId)
            },
          },
        })
      } finally {
        toast.dismiss(toastId)
      }
    },
  })
</script>

<LayoutNav title={$t('blocked-users.title')} />

<div class="h-full flex flex-col">
  <header class="flex items-center gap-2 justify-end">
    <Button
      variant={'outline'}
      disabled={$exportMutation.isPending || $query.isFetching}
      onclick={() => $exportMutation.mutate()}
    >
      <DownloadIcon class="w-4 h-4" />
      Export
    </Button>
    <Button
      variant="outline"
      onclick={onUnblock}
      disabled={$unblockMutation.isPending || $query.isFetching}
    >
      <ShieldCheckIcon class="w-4 h-4" />
      {$t('blocked-users.actions.unblock')}
    </Button>
  </header>
  <div class="flex-1 overflow-y-auto">
    <ADataTable
      {columns}
      dataSource={$query.data?.pages.flatMap((it) => it.data) ?? []}
      rowKey="id"
      rowSelection={{
        selectedRowKeys,
        onChange: (values) => (selectedRowKeys = values),
      }}
      virtual
      {onScroll}
      loading={$query.isFetching}
    />
  </div>
</div>
