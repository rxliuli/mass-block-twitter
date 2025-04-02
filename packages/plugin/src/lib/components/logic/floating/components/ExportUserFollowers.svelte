<script lang="ts">
  import { getUserFollowers } from '$lib/api/twitter'
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
    name: 'followers',
    queryKey: ['user-followers', extractScreenName(location.href)!],
    queryFn: async ({ cursor }) => {
      const user = await getUser(location.href)
      if (!user) {
        throw new Error('User not found ' + location.href)
      }
      return getUserFollowers({ userId: user.id, cursor })
    },
    getTotal: async () => {
      const user = await getUser(location.href)
      if (!user) {
        throw new Error('User not found ' + location.href)
      }
      return user.followers_count!
    },
    downloadFileName: () =>
      `user_${extractScreenName(location.href)}_followers_${new Date().toISOString()}.csv`,
  })}
  {onclick}
/>
