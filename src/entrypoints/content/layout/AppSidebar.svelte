<script lang="ts">
  import { navigate } from '$lib/components/logic/router/route.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import type { MenuItem } from './types'
  import { PanelLeftIcon } from 'lucide-svelte'

  const {
    items,
  }: {
    items: MenuItem[]
  } = $props()

  const content = $state(items.filter((it) => it.to === 'content'))
  const footer = $state(items.filter((it) => it.to === 'footer'))
  const sidebar = Sidebar.useSidebar()
</script>

<Sidebar.Root>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem class="flex justify-between">
        <Sidebar.MenuButton onclick={() => navigate('/')}>
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
                  navigate(item.url)
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
      {#each footer as item (item.title)}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton onclick={() => navigate('/settings')}>
            <item.icon />
            <span>{item.title}</span>
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/each}
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>
