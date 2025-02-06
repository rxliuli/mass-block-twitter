<script lang="ts">
  import { page } from '$app/state'

  let { children } = $props()

  const siteMetadata = {
    title: 'Mass Block Twitter',
    description: 'One-Click Solution to Clean Up Twitter/X Spam',
    author: 'rxliuli',
  }
</script>

<svelte:head>
  <title>{siteMetadata.title}</title>
  <meta name="description" content={siteMetadata.description} />
  <meta name="author" content={siteMetadata.author} />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <meta property="og:title" content={siteMetadata.title} />
  <meta property="og:description" content={siteMetadata.description} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={page.url.href} />
</svelte:head>

<div class="flex-1">
  {#if page.url.pathname === '/'}
    {@render children()}
  {:else}
    <main class="container mx-auto px-4 py-8 prose dark:prose-invert">
      {@render children()}
    </main>
  {/if}
</div>

<style>
  :global(html) {
    @apply antialiased;
  }

  :global(body) {
    @apply min-h-screen bg-background font-sans antialiased;
  }
</style>
