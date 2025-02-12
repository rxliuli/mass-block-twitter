<script lang="ts">
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { useRoute } from '$lib/components/logic/router'

  const route = useRoute()

  const userId = $derived(route.search?.get('userId'))

  onMount(() => {
    if (!userId) {
      return
    }
    $inspect(userId)
  })
</script>

<LayoutNav title="My Moderation Lists" />
<div>User {userId}</div>
