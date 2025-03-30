<script lang="ts">
  import { FileDownIcon, ShieldBanIcon } from 'lucide-svelte'
  import { t } from 'svelte-i18n'
  import * as Command from '$lib/components/ui/command'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import { getCommunityInfo, getCommunityMembers } from '$lib/api/twitter'
  import { blockUser } from '$lib/api/twitter'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { toast } from 'svelte-sonner'
  import { onExportCommunityMembersToCSVProcessed } from '../hooks/exportCommunityMembersToCSV'
  import { getCommunityId } from '../utils/getCommunityId'
  import { useController } from '$lib/stores/controller'
  import { batchQuery } from '$lib/util/batch'
  import { tP } from '$lib/i18n'
  import { downloadUsersToCSV } from '$lib/util/downloadUsersToCSV'
  import { useLoading } from '../../query'

  // https://developer.x.com/en/docs/x-api/v1/rate-limits#:~:text=15-,GET%20lists/members,-900
  // 900 requests per 15 minutes, max get 18000 members
  const query = createInfiniteQuery({
    queryKey: ['community-members', getCommunityId(location.href)],
    queryFn: async ({ pageParam }) => {
      const r = await getCommunityMembers({
        communityId: getCommunityId(location.href)!,
        cursor: pageParam,
      })
      // console.log('getCommunityMembers', r)
      return r
    },
    getNextPageParam: (lastPage) => {
      return lastPage.cursor
    },
    initialPageParam: undefined as string | undefined,
    enabled: false,
  })
  const getUsers = () => $query.data?.pages.flatMap((it) => it.data) ?? []

  let controller = useController()
  const authInfo = useAuthInfo()
  const { loadings, withLoading } = useLoading<{
    exportCommunicationMembersToCsv: boolean
    blockCommunicationMembers: boolean
  }>(true)

  const blockCommunicationMembersMutation = createMutation({
    mutationFn: withLoading(
      async () => {
        if ($blockCommunicationMembersMutation.isPending) {
          return
        }
        const communityId = getCommunityId(location.href)
        if (!communityId) {
          toast.error(
            $t('floatingButton.community.exportMembers.toast.notFoundId'),
          )
          return
        }
        const [info, _] = await Promise.all([
          getCommunityInfo({ communityId }),
          $query.fetchNextPage(),
        ])
        // console.log('onMount after', getUsers())
        controller.create()
        await batchBlockUsersMutation({
          controller,
          users: () => $query.data?.pages.flatMap((it) => it.data) ?? [],
          total: info.member_count,
          blockUser: async (user) => {
            if (user.community_role !== 'Member') {
              return 'skip'
            }
            await blockUser(user)
          },
          getAuthInfo: async () => authInfo.value!,
          onProcessed: async (user, meta) => {
            console.log(
              `[batchBlockMutation] onProcesssed ${meta.index} ${user.screen_name} ` +
                new Date().toISOString(),
            )
            if (meta.index % 10 === 0) {
              // console.log('fetchNextPage before')
              if (!$query.isPending) {
                await $query.fetchNextPage()
              }
              // console.log('fetchNextPage after', getUsers())
            }
          },
        })
      },
      () => 'blockCommunicationMembers',
    ),
  })

  const exportCsvMutation = createMutation({
    mutationKey: ['exportCommunicationMembersToCsv'],
    mutationFn: withLoading(
      async () => {
        const communityId = getCommunityId(location.href)
        if (!communityId) {
          toast.error(
            $t('floatingButton.community.exportMembers.toast.notFoundId'),
          )
          return
        }
        await $query.fetchNextPage()
        controller.create()
        const info = await getCommunityInfo({ communityId })
        const toastId = toast.loading(
          tP('floatingButton.community.exportMembers.toast.title'),
        )

        try {
          await batchQuery({
            controller,
            getItems: getUsers,
            total: info.member_count,
            fetchNextPage: async () => $query.fetchNextPage(),
            hasNext: () => $query.hasNextPage,
            onProcessed: (context) =>
              onExportCommunityMembersToCSVProcessed(context, toastId),
          })
          toast.success(
            tP('floatingButton.community.exportMembers.toast.success'),
            {
              duration: 1000000,
              description: tP(
                'floatingButton.community.exportMembers.toast.success.description',
                { values: { count: getUsers().length } },
              ),
              action: {
                label: tP(
                  'floatingButton.community.exportMembers.toast.download',
                ),
                onClick: () => {
                  const users = getUsers()
                  downloadUsersToCSV(
                    users,
                    `community_${communityId}_${new Date().toISOString()}.csv`,
                  )
                },
              },
            },
          )
        } finally {
          toast.dismiss(toastId)
        }
      },
      () => 'exportCommunicationMembersToCsv',
    ),
  })

  let {
    onclick,
  }: {
    onclick?: () => void
  } = $props()
</script>

<Command.Item
  onclick={() => {
    onclick?.()
    $blockCommunicationMembersMutation.mutate()
  }}
  disabled={loadings.blockCommunicationMembers}
>
  <ShieldBanIcon color={'red'} />
  <span>{$t('floatingButton.community.blockMembers')}</span>
</Command.Item>
<Command.Item
  onclick={() => {
    $exportCsvMutation.mutate()
    onclick?.()
  }}
  disabled={loadings.exportCommunicationMembersToCsv}
>
  <FileDownIcon />
  <span>{$t('floatingButton.community.exportMembers')}</span>
</Command.Item>
