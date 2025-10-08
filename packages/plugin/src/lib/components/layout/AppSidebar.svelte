<script lang="ts">
  import { navigate } from '$lib/components/logic/router/route.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import type { MenuItem } from './types'
  import { PanelLeftIcon } from 'lucide-svelte'
  import AuthButton from './AuthButton.svelte'

  const {
    items,
  }: {
    items: MenuItem[]
  } = $props()

  const content = $derived(items.filter((it) => it.to === 'content'))
  const footer = $derived(items.filter((it) => it.to === 'footer'))
  const sidebar = Sidebar.useSidebar()

  function onClickMenuUrl(url: string) {
    navigate(url)
    if (sidebar.isMobile) {
      sidebar.setOpenMobile(false)
    }
    // console.log('onClickMenuUrl', url, sidebar.open)
  }
</script>

<Sidebar.Root>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem class="flex justify-between items-center">
        <Sidebar.MenuButton
          class="font-bold"
          onclick={() => onClickMenuUrl('/')}
        >
          Mass Block Twitter
        </Sidebar.MenuButton>
        {#if sidebar.isMobile}
          <Button variant="ghost" size="icon" onclick={() => sidebar.toggle()}>
            <PanelLeftIcon />
          </Button>
        {/if}
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Menu>
      {#each content as item (item.title)}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton>
            {#snippet child({ props })}
              <a
                {...props}
                href={item.url}
                onclick={(ev) => {
                  ev.preventDefault()
                  onClickMenuUrl(item.url)
                }}
              >
                <item.icon />
                <span>{item.title}</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/each}
    </Sidebar.Menu>
  </Sidebar.Content>
  <Sidebar.Footer>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton>
          {#snippet child({ props })}
            <a href="https://discord.gg/gFhKUthc88" target="_blank" {...props}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="currentColor"
                ><path
                  d="M524.5 69.8a1.5 1.5 0 0 0 -.8-.7A485.1 485.1 0 0 0 404.1 32a1.8 1.8 0 0 0 -1.9 .9 337.5 337.5 0 0 0 -14.9 30.6 447.8 447.8 0 0 0 -134.4 0 309.5 309.5 0 0 0 -15.1-30.6 1.9 1.9 0 0 0 -1.9-.9A483.7 483.7 0 0 0 116.1 69.1a1.7 1.7 0 0 0 -.8 .7C39.1 183.7 18.2 294.7 28.4 404.4a2 2 0 0 0 .8 1.4A487.7 487.7 0 0 0 176 479.9a1.9 1.9 0 0 0 2.1-.7A348.2 348.2 0 0 0 208.1 430.4a1.9 1.9 0 0 0 -1-2.6 321.2 321.2 0 0 1 -45.9-21.9 1.9 1.9 0 0 1 -.2-3.1c3.1-2.3 6.2-4.7 9.1-7.1a1.8 1.8 0 0 1 1.9-.3c96.2 43.9 200.4 43.9 295.5 0a1.8 1.8 0 0 1 1.9 .2c2.9 2.4 6 4.9 9.1 7.2a1.9 1.9 0 0 1 -.2 3.1 301.4 301.4 0 0 1 -45.9 21.8 1.9 1.9 0 0 0 -1 2.6 391.1 391.1 0 0 0 30 48.8 1.9 1.9 0 0 0 2.1 .7A486 486 0 0 0 610.7 405.7a1.9 1.9 0 0 0 .8-1.4C623.7 277.6 590.9 167.5 524.5 69.8zM222.5 337.6c-29 0-52.8-26.6-52.8-59.2S193.1 219.1 222.5 219.1c29.7 0 53.3 26.8 52.8 59.2C275.3 311 251.9 337.6 222.5 337.6zm195.4 0c-29 0-52.8-26.6-52.8-59.2S388.4 219.1 417.9 219.1c29.7 0 53.3 26.8 52.8 59.2C470.7 311 447.5 337.6 417.9 337.6z"
                /></svg
              >
              <span>Join Community</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton>
          {#snippet child({ props })}
            <a href="https://store.rxliuli.com/" target="_blank" {...props}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                ><rect width="7" height="7" x="3" y="3" rx="1" /><rect
                  width="7"
                  height="7"
                  x="14"
                  y="3"
                  rx="1"
                /><rect width="7" height="7" x="14" y="14" rx="1" /><rect
                  width="7"
                  height="7"
                  x="3"
                  y="14"
                  rx="1"
                /></svg
              >
              <span>Our other extensions</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      <AuthButton />

      {#each footer as item (item.title)}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton onclick={() => onClickMenuUrl('/settings')}>
            <item.icon />
            <span>{item.title}</span>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/each}
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>
