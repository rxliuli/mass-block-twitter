<script lang="ts">
  import * as Popover from '$lib/components/ui/popover'
  import icon from './assets/48.png'
  import { shadcnConfig } from '../config'
  import { SquareArrowOutUpRightIcon, XIcon } from 'lucide-svelte'
  import * as Command from '$lib/components/ui/command'
  import { useOpen } from '$lib/stores/open.svelte'
  import { useSettings } from '$lib/settings'
  import { toast } from 'svelte-sonner'
  import CloseFloatingButtonToast from './components/CloseFloatingButtonToast.svelte'
  import { t } from '$lib/i18n'
  import { useLocation } from '$lib/hooks/useLocation.svelte'
  import BlockCommunicationMembers from './components/BlockCommunicationMembers.svelte'

  function isElementInPortal(
    element: Element | null,
    portal: Element | null | undefined,
  ): boolean {
    if (!element || !portal) return false
    let current: Element | null = element
    while (current) {
      if (current === portal) return true
      current = current.parentElement
    }
    return false
  }

  const openState = useOpen()

  let top = $state(0)
  onMount(() => {
    top = document.documentElement.clientHeight / 2 - 40
  })

  const settings = useSettings()

  function onCloseFloatingButton() {
    const toastId = toast(CloseFloatingButtonToast as any, {
      duration: 1000000,
      position: 'top-center',
      action: {
        label: 'Close',
        onClick: () => {
          $settings.showFloatingButton = false
          toast.dismiss(toastId)
        },
      },
    })
  }

  let open = $state(false)

  const loc = useLocation()
  const page = $derived.by<'home' | 'community' | undefined>(() => {
    const url = loc.url
    if (!url) {
      return
    }
    if (url.pathname === '/home') {
      return 'home'
    }
    if (url.pathname.startsWith('/i/communities/')) {
      return 'community'
    }
  })

  onMount(() => {
    const onClick = (ev: MouseEvent) => {
      const target = ev.target
      if (
        target &&
        target instanceof Element &&
        target.tagName === 'mass-block-twitter'.toUpperCase()
      ) {
        return
      }
      open = false
    }
    document.addEventListener('click', onClick)
    const onTouchEnd = (ev: TouchEvent) => {
      const touch = ev.changedTouches[0]
      if (touch) {
        const target = document.elementFromPoint(touch.clientX, touch.clientY)
        if (target && target.tagName === 'mass-block-twitter'.toUpperCase()) {
          return
        }
      }
      open = false
    }
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('touchend', onTouchEnd)
    }
  })
</script>

{#if $settings.showFloatingButton ?? true}
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button
          class="fixed right-0 top-0 outline-none transition-opacity {open
            ? 'opacity-100'
            : 'opacity-50 hover:opacity-100'}"
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
              open = false
              openState.openModal()
            }}
          >
            <SquareArrowOutUpRightIcon />
            <span>{$t('floatingButton.openDashboard')}</span>
          </Command.Item>
          {#if page === 'community'}
            <BlockCommunicationMembers
              onclick={() => {
                open = false
              }}
            />
          {/if}
          <Command.Item
            onclick={() => {
              open = false
              onCloseFloatingButton()
            }}
          >
            <XIcon />
            <span>{$t('floatingButton.close')}</span>
          </Command.Item>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
{/if}
