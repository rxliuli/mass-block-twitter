<script lang="ts">
  import { cn } from '$lib/utils'

  const props: {
    children?: string | number | boolean
    class: string
    title?: string
  } = $props()
</script>

<a
  class={cn(props.class, 'text-blue-500')}
  title={props.title}
  href={`https://x.com/${props.children}`}
  target="_blank"
>
  @{props.children}
</a>
