<script lang="ts">
  import { Button } from '$lib/components/ui/button'

  const props: {
    userId: string
  } = $props()

  function onViewDetails() {
    console.log(props.userId)
  }
</script>

<Button onclick={onViewDetails}>View Details</Button>
