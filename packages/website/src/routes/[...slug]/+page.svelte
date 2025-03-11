<script lang="ts">
  let { data } = $props()
</script>

<svelte:head>
  <!-- <title>{data.meta.title}</title> -->
  <meta property="og:type" content="docs" />
</svelte:head>

<article
  class="container max-w-3xl mx-auto prose dark:prose-invert prose-sm py-4"
>
  {@html data.html}
</article>

<style>
  :global(iframe[src*='youtube']) {
    max-width: 100%;
    max-height: 80dvh;
    width: 800px;
    aspect-ratio: 9/16;
    height: auto;
  }
</style>
