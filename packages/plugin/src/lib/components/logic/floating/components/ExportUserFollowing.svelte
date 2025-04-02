<script lang="ts">
  import { getUserFollowing } from '$lib/api/twitter'
  import { extractScreenName, getUser } from '../hooks/onExportUsers'
  import ExportUsers from './ExportUsers.svelte'

  let {
    onclick,
  }: {
    onclick?: () => void
  } = $props()
</script>

<ExportUsers
  getProps={() => ({
    title: `Export ${extractScreenName(location.href)} following`,
    name: 'following',
    queryKey: ['user-following', extractScreenName(location.href)!],
    queryFn: async ({ cursor }) => {
      const user = await getUser(location.href)
      if (!user) {
        throw new Error('User not found ' + location.href)
      }
      return getUserFollowing({ userId: user.id, cursor })
    },
    getTotal: async () => {
      const user = await getUser(location.href)
      if (!user) {
        throw new Error('User not found ' + location.href)
      }
      return user.friends_count!
    },
    downloadFileName: () =>
      `user_${extractScreenName(location.href)}_following_${new Date().toISOString()}.csv`,
  })}
  {onclick}
/>
