<script lang="ts">
  import { ShieldBanIcon } from 'lucide-svelte'
  import { t } from 'svelte-i18n'
  import * as Command from '$lib/components/ui/command'
  import { createInfiniteQuery, createMutation } from '@tanstack/svelte-query'
  import {
    extractCommunityQueryGraphqlId,
    extractMembersSliceTimelineGraphqlId,
    getCommunityInfo,
    getCommunityMembers,
  } from '$lib/api/twitter'
  import { blockUser } from '$lib/api'
  import { batchBlockUsersMutation } from '$lib/hooks/batchBlockUsers'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { toast } from 'svelte-sonner'

  function getCommunityId() {
    // https://x.com/i/communities/1900366536683987325/members
    // https://x.com/i/communities/1900366536683987325
    const match = location.pathname.match(
      /^\/i\/communities\/(\d+)(\/members)?$/,
    )
    if (!match) {
      return
    }
    return match[1]
  }
  const query = createInfiniteQuery({
    queryKey: ['community-members', getCommunityId()],
    queryFn: async ({ pageParam }) => {
      const r = await getCommunityMembers({
        communityId: getCommunityId()!,
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

  let controller = $state(new AbortController())
  onDestroy(() => {
    controller.abort()
  })
  const authInfo = useAuthInfo()
  const blockCommunicationMembersMutation = createMutation({
    mutationFn: async () => {
      if ($blockCommunicationMembersMutation.isPending) {
        return
      }
      const communityId = getCommunityId()
      if (!communityId) {
        toast.error('Not found community id')
        return
      }
      const [info, _] = await Promise.all([
        getCommunityInfo({ communityId }),
        $query.fetchNextPage(),
      ])
      // console.log('onMount after', getUsers())
      controller.abort()
      controller = new AbortController()
      await batchBlockUsersMutation({
        controller,
        users: getUsers,
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
  })

  let {
    onclick,
  }: {
    onclick?: () => void
  } = $props()

  onMount(async () => {
    await extractMembersSliceTimelineGraphqlId()
    await extractCommunityQueryGraphqlId()
  })
</script>

<Command.Item
  onclick={() => {
    onclick?.()
    $blockCommunicationMembersMutation.mutate()
  }}
>
  <ShieldBanIcon color={'red'} />
  <span>{$t('floatingButton.blockCommunicationMembers')}</span>
</Command.Item>
