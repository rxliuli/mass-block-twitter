<script lang="ts">
  import {
    type CommunityMember,
    getCommunityInfo,
    getCommunityMembers,
  } from '$lib/api/twitter'
  import { blockUser } from '$lib/api/twitter'
  import { getCommunityId } from '../utils/getCommunityId'
  import ExportUsers from './ExportUsers.svelte'

  let {
    onclick,
  }: {
    onclick?: () => void
  } = $props()
</script>

<ExportUsers
  getProps={() => ({
    name: 'community members',
    queryKey: ['community-members', getCommunityId(location.href)!],
    queryFn: async ({ cursor }) => {
      return await getCommunityMembers({
        communityId: getCommunityId(location.href)!,
        cursor,
      })
    },
    getTotal: async () => {
      const info = await getCommunityInfo({
        communityId: getCommunityId(location.href)!,
      })
      return info.member_count
    },
    downloadFileName: () => {
      return `community_${getCommunityId(location.href)}_${new Date().toISOString()}.csv`
    },
    blockUser: async (user: CommunityMember) => {
      if (user.community_role !== 'Member') {
        return 'skip'
      }
      await blockUser(user)
    },
    // https://developer.x.com/en/docs/x-api/v1/rate-limits#:~:text=15-,GET%20lists/members,-900
    // 900 requests per 15 minutes, max get 18000 members
    maxQueryCount: 850,
  })}
  {onclick}
/>
