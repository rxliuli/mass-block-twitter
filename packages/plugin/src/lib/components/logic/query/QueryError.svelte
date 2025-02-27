<script lang="ts">
  import * as Alert from '$lib/components/ui/alert'
  import { CircleAlert } from 'lucide-svelte'

  const props: {
    title?: string
    description?: string
  } = $props()
</script>

<Alert.Root variant="destructive">
  <CircleAlert class="size-4" />
  <Alert.Title>{props.title ?? 'Error'}</Alert.Title>
  <Alert.Description>{props.description}</Alert.Description>
</Alert.Root>
