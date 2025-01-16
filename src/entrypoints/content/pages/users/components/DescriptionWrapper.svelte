<script lang="ts">
  const props: {
    description: string
  } = $props()
</script>

<div class="text-sm truncate" title={props.description}>
  {props.description}
</div>
