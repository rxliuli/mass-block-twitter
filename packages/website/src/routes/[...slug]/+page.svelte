<script lang="ts">
  let { data } = $props()
</script>

<svelte:head>
  <title>{data.meta.title}</title>
  <meta property="og:type" content="docs" />
</svelte:head>

<article>
  <div class="container mx-auto prose dark:prose-invert prose-sm py-4">
    <h1>{data.meta.title}</h1>
    <data.content />
  </div>
</article>
