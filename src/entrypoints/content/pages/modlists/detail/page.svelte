<script lang="ts">
  import { useRoute } from '$lib/components/logic/router'
  import {
    createMutation,
    createQuery,
    useQueryClient,
  } from '@tanstack/svelte-query'
  import type { ModList, ModListUser } from '@mass-block-twitter/server'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import {
    EllipsisIcon,
    PencilIcon,
    ShareIcon,
    Trash2Icon,
  } from 'lucide-svelte'
  import { shadcnConfig } from '$lib/components/logic/config'
  import { fakerZH_CN as faker } from '@faker-js/faker'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo'
  import ModlistUser from './components/ModlistUser.svelte'
  import ModlistDesc from './components/ModlistDesc.svelte'
  import { QueryError, QueryLoading } from '$lib/components/logic/query'

  const route = useRoute()
  const authInfo = useAuthInfo()

  const metadata = createQuery({
    queryKey: ['modlistMetadata'],
    queryFn: async () => {
      return {
        id: route.search?.get('id') ?? '',
        name: 'test',
        description: 'test',
        avatar: 'test',
        userCount: 0,
        subscriptionCount: 0,
        localUserId: 'test',
        twitterUserId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        subscribed: false,
        owner: false,
        twitterScreenName: 'test',
      } satisfies ModList & {
        subscribed: boolean
        owner: boolean
        twitterScreenName: string
      }
    },
  })

  const query = createQuery({
    queryKey: ['modlistUser'],
    queryFn: async () => {
      return Array.from({ length: 100 }, () => ({
        id: faker.string.uuid(),
        twitterUserId: faker.string.uuid(),
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
        modListId: route.search?.get('id') ?? '',
        screenName: faker.internet.username(),
        name: faker.person.fullName(),
        profileImageUrl: faker.image.avatar(),
        description: faker.lorem.sentence(),
      })) satisfies (ModListUser & {
        screenName: string
        name: string
        profileImageUrl?: string
        description?: string
      })[]
      // const res = await fetch(
      //   `${SERVER_URL}/modlists/get/${route.search?.get('id')}`,
      // )
      // return res.json()
    },
  })

  const queryClient = useQueryClient()
  const subscribeMutation = createMutation({
    mutationFn: async () => {
      return {
        success: true,
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['modlistMetadata'] })
    },
  })
  const unsubscribeMutation = createMutation({
    mutationFn: async () => {
      return {
        success: true,
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['modlistMetadata'] })
    },
  })

  const deleteMutation = createMutation({
    mutationFn: async (id: string) => {
      return {
        success: true,
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['modlistUser'] })
    },
  })
</script>

<LayoutNav title="Modlist Detail">
  {#if $metadata.isLoading}
    <QueryLoading />
  {:else if $metadata.data?.subscribed}
    <Button
      variant="destructive"
      onclick={() => $unsubscribeMutation.mutate()}
      disabled={$unsubscribeMutation.isPending}
    >
      {$unsubscribeMutation.isPending ? 'Unsubscribing...' : 'Unsubscribe'}
    </Button>
  {:else}
    <Button
      onclick={() => $subscribeMutation.mutate()}
      disabled={$subscribeMutation.isPending}
    >
      {$subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
    </Button>
  {/if}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      <Button variant="ghost" size="icon">
        <EllipsisIcon />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content portalProps={{ to: shadcnConfig.get().portal }}>
      <!-- <DropdownMenu.Item>
        Copy Link to list
        <DropdownMenu.Shortcut>
          <ShareIcon />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item> -->
      <DropdownMenu.Item>
        Edit list details
        <DropdownMenu.Shortcut>
          <PencilIcon />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
      <DropdownMenu.Item>
        Delete list
        <DropdownMenu.Shortcut>
          <Trash2Icon />
        </DropdownMenu.Shortcut>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</LayoutNav>

{#if $metadata.isLoading}
  <QueryLoading />
{:else if $metadata.data}
  <ModlistDesc modlist={$metadata.data} />
{:else}
  <QueryError description={'Load modlist detail failed'} />
{/if}

<div>
  {#each $query.data ?? [] as user (user.id)}
    <ModlistUser {user}>
      {#snippet actions()}
        {#if $metadata.data?.owner}
          <Button
            variant="destructive"
            onclick={() => $deleteMutation.mutate(user.id)}
            disabled={$deleteMutation.isPending}
          >
            {$deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        {/if}
      {/snippet}
    </ModlistUser>
  {/each}
</div>
