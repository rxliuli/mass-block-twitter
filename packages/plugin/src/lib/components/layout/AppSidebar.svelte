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
