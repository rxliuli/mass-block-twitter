<script lang="ts">
  import { type CommunityMember } from '$lib/api/twitter'
  import { exportCommunityMembersToCSV } from '../exportCommunityMembersToCSV'

  let {
    communityId,
    data,
    controller,
    onFetchNextPage,
  }: {
    communityId: string
    data: CommunityMember[]
    controller: AbortController
    onFetchNextPage?: () => Promise<void>
  } = $props()

  let index = 0
  const onExport = async () => {
    exportCommunityMembersToCSV({
      communityId,
      getCommunityInfo: async () => ({
        id: '123456789',
        name: 'test',
        description: 'test',
        member_count: data.length,
        is_nsfw: false,
      }),
      getItems: () => data.slice(0, index),
      hasNext: () => index < data.length,
      fetchNextPage: async () => {
        index += 20
        await onFetchNextPage?.()
      },
      controller,
    })
  }
</script>

<button onclick={onExport}>Export</button>
