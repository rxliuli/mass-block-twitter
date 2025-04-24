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
  import ExportUserBlueVerifiedFollowers from './components/ExportUserBlueVerifiedFollowers.svelte'
  import ExportUserFollowers from './components/ExportUserFollowers.svelte'
  import ExportUserFollowing from './components/ExportUserFollowing.svelte'
  import { type Component } from 'svelte'

  const openState = useOpen()

  let top = $state(0)
  onMount(() => {
    top = document.documentElement.clientHeight / 2 - 100
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

  interface FloatingButtonItem {
    isMatch: () => boolean | undefined
    component: Component
  }

  const renderItems: FloatingButtonItem[] = $derived(
    [
      {
        isMatch: () => loc.url.pathname.startsWith('/i/communities/'),
        component: BlockCommunicationMembers,
      },
      {
        isMatch: () => loc.url.pathname.endsWith('/verified_followers'),
        component: ExportUserBlueVerifiedFollowers,
      },
      {
        isMatch: () => loc.url.pathname.endsWith('/followers'),
        component: ExportUserFollowers,
      },
      {
        isMatch: () => loc.url.pathname.endsWith('/following'),
        component: ExportUserFollowing,
      },
    ].filter((it) => it.isMatch()),
  )

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
          {#each renderItems as item}
            <item.component
              onclick={() => {
                open = false
              }}
            />
          {/each}
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
