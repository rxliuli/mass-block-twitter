<script lang="ts">
  // import html from '../README.md?html'
  // import meta from '../README.md?meta'
  import Demo from './Demo.svelte'
  import component from '../README.md?svelte'
</script>

<!-- <div>{@html html}</div> -->
<!-- <pre>{JSON.stringify(meta, null, 2)}</pre> -->
<Demo />
<svelte:component this={component} />

