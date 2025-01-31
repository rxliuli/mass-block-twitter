<script lang="ts">
  import { shadcnConfig } from '$lib/components/logic/config'

  $effect(() => {
    console.log('shadcnConfig.get()', shadcnConfig.get())
  })
</script>

<div></div>
