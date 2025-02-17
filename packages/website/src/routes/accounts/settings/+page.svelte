<script lang="ts">
  import * as Card from '@/components/ui/card'
  import dayjs from 'dayjs'
  import { createQuery } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { getAuthInfo } from '@/components/auth/auth.svelte'
  import Loading from '@/components/ui/Loading.svelte'

  const query = createQuery<{
    id: string
    email: string
    isPro: boolean
    createdAt: string
    lastLogin: string
  }>({
    queryKey: ['settings'],
    retry: false,
    queryFn: async () => {
      const resp = await fetch(
        import.meta.env.VITE_API_URL + '/api/accounts/settings',
        {
          headers: {
            Authorization: (await getAuthInfo())?.token!,
          },
        },
      )
      if (!resp.ok) {
        if (resp.status === 401) {
          return goto('/accounts/login')
        }
        throw new Error('Failed to fetch settings')
      }
      return await resp.json()
    },
  })
</script>

<div class="container max-w-5xl mx-auto py-10">
  <Card.Root>
    <Card.Header>
      <Card.Title>Basic Information</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      {#if $query.isLoading}
        <Loading />
      {:else if $query.error}
        <div class="flex justify-center items-center h-full">
          <p class="text-red-500">Error: {$query.error.message}</p>
        </div>
      {:else if !$query.data}
        <Loading />
      {:else}
        <div class="flex justify-between gap-4 items-center">
          <p class="font-bold">Email</p>
          <p class="text-gray-400">{$query.data.email}</p>
        </div>
        <div
          class="flex justify-between gap-4 items-center {$query.data.isPro
            ? 'block'
            : 'hidden'}"
        >
          <p class="font-bold">Is Pro</p>
          <p class="text-gray-400">{$query.data.isPro ? 'Yes' : 'No'}</p>
        </div>
        <div class="flex justify-between gap-4 items-center">
          <p class="font-bold">Created At</p>
          <p class="text-gray-400">
            {dayjs($query.data.createdAt).format('YYYY-MM-DD hh:mm')}
          </p>
        </div>
        <div class="flex justify-between gap-4 items-center">
          <p class="font-bold">Last Login</p>
          <p class="text-gray-400">
            {dayjs($query.data.lastLogin).format('YYYY-MM-DD hh:mm')}
          </p>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
