<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar'

  let { src, title } = $props<{ src?: string; title: string }>()
</script>

<Avatar.Root>
  <Avatar.Image {src} alt={title} />
  <Avatar.Fallback>{title.slice(0, 2)}</Avatar.Fallback>
</Avatar.Root>
