<script lang="ts">
  import { getUserBlueVerifiedFollowers } from '$lib/api/twitter'
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
    title: `Export ${extractScreenName(location.href)} verified followers`,
    name: 'verified followers',
    queryKey: ['user-verified-followers', extractScreenName(location.href)!],
    queryFn: async ({ cursor }) => {
      const user = await getUser(location.href)
      if (!user) {
        throw new Error('User not found ' + location.href)
      }
      return getUserBlueVerifiedFollowers({ userId: user.id, cursor })
    },
    getTotal: async () => {
      const user = await getUser(location.href)
      if (!user) {
        throw new Error('User not found ' + location.href)
      }
      return user.followers_count!
    },
    downloadFileName: () =>
      `user_${extractScreenName(location.href)}_verified_followers_${new Date().toISOString()}.csv`,
  })}
  {onclick}
/>
