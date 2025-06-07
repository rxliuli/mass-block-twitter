<script lang="ts">
  import { clearAuthInfo, getAuthInfo, userState } from './auth.svelte'
  import Loading from '../ui/Loading.svelte'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { UserIcon } from 'lucide-svelte'
  import { Button } from '../ui/button'
  import {
    createMutation,
    createQuery,
    useQueryClient,
  } from '@tanstack/svelte-query'

  const query = createQuery({
    queryKey: ['authInfo'],
    queryFn: getAuthInfo,
  })

  const queryClient = useQueryClient()
  const logoutMutation = createMutation({
    mutationFn: async () => {
      const authInfo = await getAuthInfo()
      if (!authInfo) {
        throw new Error('No auth info')
      }
      const resp = await fetch(
         '/api/auth/logout',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${authInfo.token}` },
        },
      )
      if (!resp.ok) {
        throw new Error('Failed to logout')
      }
      clearAuthInfo()
      queryClient.invalidateQueries()
    },
  })
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
          onclick={() => $logoutMutation.mutate()}
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
