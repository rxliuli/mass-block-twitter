<script lang="ts">
  import * as Popover from '$lib/components/ui/popover'
  import icon from './assets/48.png'
  import { shadcnConfig } from '../config'
  import { SquareArrowOutUpRightIcon, XIcon } from 'lucide-svelte'
  import * as Command from '$lib/components/ui/command'
  import { useOpen } from '$lib/stores/open.svelte'
  import { useSettings } from '$lib/settings'

  const openState = useOpen()

  let top = $state(0)
  onMount(() => {
    top = document.documentElement.clientHeight / 2 - 40
  })

  const settings = useSettings()

  function onCloseFloatingButton() {
    const confirmed = confirm(
      'Are you sure you want to close the floating button?',
    )
    if (!confirmed) {
      return
    }
    $settings.showFloatingButton = false
  }

  let open = $state(false)
</script>

{#if $settings.showFloatingButton ?? true}
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          class="fixed right-0 top-0 outline-none"
          {...props}
          style={`top: ${top}px`}
        >
          <img
            src={icon}
            alt="icon"
            class="w-10 h-10 rounded-full select-none pointer-events-none"
          />
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      class="p-0"
      side="left"
      portalProps={{
        to: shadcnConfig.get().portal,
      }}
    >
      <Command.Root>
        <Command.List>
          <Command.Item
            onclick={() => {
              openState.openModal()
              open = false
            }}
          >
            <SquareArrowOutUpRightIcon />
            <span>Open Plugin Dashboard</span>
          </Command.Item>
          <Command.Item
            onclick={() => {
              onCloseFloatingButton()
              open = false
            }}
          >
            <XIcon />
            <span>Close Floating Button</span>
          </Command.Item>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
{/if}
