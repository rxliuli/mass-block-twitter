<script lang="ts">
  const props: {
    children?: string | number | boolean
    class: string
    title?: string
  } = $props()
</script>

<div class={props.class} title={props.title}>
  {props.children}
</div>
