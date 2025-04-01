<script lang="ts">
  import type { PageProps } from './$types'
  import { onMount } from 'svelte'

  let { data }: PageProps = $props()

  onMount(() => {
    const article = document.querySelector('article')
    if (!article) return

    const hash = window.location.hash.slice(1)
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }
      }, 100)
    }

    article.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.matches('.header-anchor')) {
        e.preventDefault()
        const id = target.getAttribute('href')?.slice(1)
        if (!id) return

        const element = document.getElementById(id)
        if (!element) return

        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })

        history.pushState(null, '', `#${id}`)
      }
    })
  })
</script>

<svelte:head>
  <!-- <title>{data.meta.title}</title> -->
  <meta property="og:type" content="docs" />
</svelte:head>

<article
  class="content container max-w-3xl mx-auto prose dark:prose-invert prose-sm py-4"
>
  {@html data.html}
</article>

<style>
  .content :global(iframe[src*='youtube'].vertical-video) {
    max-width: 100%;
    max-height: 80dvh;
    width: 800px;
    aspect-ratio: 9/16;
    height: auto;
  }

  .content :global(iframe[src*='youtube'].horizontal-video) {
    max-width: 100%;
    max-height: 80dvh;
    width: 800px;
    aspect-ratio: 16/9;
    height: auto;
  }

  .content :global(.header-anchor) {
    float: left;
    margin-left: -0.87em;
    padding-right: 0.23em;
    font-weight: 500;
    opacity: 0;
    text-decoration: none;
    color: var(--primary);
  }

  .content :global(:is(h1, h2, h3, h4, h5, h6)) {
    scroll-margin-top: theme('spacing.16');
    position: relative;
  }

  .content :global(:is(h1, h2, h3, h4, h5, h6):hover .header-anchor) {
    opacity: 1;
  }

  .content :global(.header-anchor:hover) {
    text-decoration: none;
  }
</style>
