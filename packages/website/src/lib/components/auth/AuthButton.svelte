<script lang="ts">
  import { getAuthInfo, useLogout, userState } from './auth.svelte'
  import Loading from '../ui/Loading.svelte'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { UserIcon } from 'lucide-svelte'
  import { Button } from '../ui/button'
  import { createQuery } from '@tanstack/svelte-query'

  const query = createQuery({
    queryKey: ['authInfo'],
    queryFn: getAuthInfo,
  })

  const logout = useLogout()
</script>

{#if $query.isLoading}
  <Loading />
{:else if $query.error}
  <div class="flex justify-center items-center h-full">
    <p class="text-red-500">Error: {$query.error.message}</p>
  </div>
{:else if userState.authInfo}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Button variant="ghost" size="icon" data-testid="profile-button">
        <UserIcon class="w-4 h-4" />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Group>
        <DropdownMenu.GroupHeading>
          {userState.authInfo.email}
        </DropdownMenu.GroupHeading>
        <DropdownMenu.Separator />
        <DropdownMenu.Item>
          {#snippet child({ props })}
            <a
              href="/accounts/settings"
              {...props}
              class="{props.class} cursor-pointer"
            >
              Settings
            </a>
          {/snippet}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class="cursor-pointer"
          onclick={() => $logout.mutate()}
        >
          Logout
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else}
  <a
    href="/accounts/login"
    class="mr-6 transition-colors hover:text-foreground/80"
    data-testid="login-button"
  >
    Login
  </a>
{/if}
