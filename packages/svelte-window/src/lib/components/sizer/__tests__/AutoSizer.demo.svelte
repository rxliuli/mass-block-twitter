<script lang="ts">
  import AutoSizer from '../AutoSizer.svelte'
</script>

<div title="test-parent">
  <AutoSizer>
    {#snippet child({ width, height })}
      <div
        style="width: {width}px; height: {height}px;"
        title="test-child"
      ></div>
    {/snippet}
  </AutoSizer>
</div>
