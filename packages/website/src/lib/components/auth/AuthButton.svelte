<script lang="ts">
  import { useAuthInfo, useLogout } from './auth.svelte'
  import Loading from '../ui/Loading.svelte'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { UserIcon } from 'lucide-svelte'
  import { Button } from '../ui/button'

  const query = useAuthInfo()

  const logout = useLogout()
</script>

{#if $query.isLoading}
  <Loading />
{:else if $query.error}
  <div class="flex justify-center items-center h-full">
    <p class="text-red-500">Error: {$query.error.message}</p>
  </div>
{:else if $query.data}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Button variant="ghost" size="icon">
        <UserIcon class="w-4 h-4" />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Group>
        <DropdownMenu.GroupHeading>
          {$query.data.email}
        </DropdownMenu.GroupHeading>
        <DropdownMenu.Separator />
        <DropdownMenu.Item>
          <a href="/accounts/settings">Settings</a>
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
  >
    Login
  </a>
{/if}
