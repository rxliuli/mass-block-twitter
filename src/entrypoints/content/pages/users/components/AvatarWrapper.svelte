<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar'

  let {
    src,
    alt,
    fallback,
    screen_name,
  }: {
    src?: string
    alt?: string
    fallback?: string
    screen_name: string
  } = $props()
</script>

<a href={`https://x.com/${screen_name}`} target="_blank">
  <Avatar.Root>
    <Avatar.Image {src} {alt} />
    <Avatar.Fallback>{fallback}</Avatar.Fallback>
  </Avatar.Root>
</a>
