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

  <img {src} {alt} class="w-8 h-8 rounded-full max-w-8 max-h-8" />
  <!-- <Avatar.Root>
    <Avatar.Image {src} {alt} />
    <Avatar.Fallback>{fallback}</Avatar.Fallback>
  </Avatar.Root> -->
