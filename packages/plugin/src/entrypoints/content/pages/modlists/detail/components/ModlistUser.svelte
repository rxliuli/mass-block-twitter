<script lang="ts">
  import {
    Avatar,
    AvatarImage,
    AvatarFallback,
  } from '$lib/components/ui/avatar'
  import type { ModListUsersResponse } from '@mass-block-twitter/server'
  import type { Snippet } from 'svelte'

  const {
    user,
    actions,
  }: {
    user: ModListUsersResponse[number]
    actions?: Snippet
  } = $props()
</script>

<a
  href={`https://twitter.com/${user.screenName}`}
  target="_blank"
  class="w-full py-4 rounded-lg grid grid-cols-[auto_1fr_auto] gap-3"
>
  <Avatar class="h-12 w-12">
    <AvatarImage src={user.profileImageUrl} alt={user.name} />
    <AvatarFallback>ML</AvatarFallback>
  </Avatar>
  <div class="flex flex-col">
    <h2 class="font-semibold text-base">{user.name}</h2>
    <p class="text-sm text-zinc-400">{user.screenName}</p>
  </div>

  <div>{@render actions?.()}</div>

  <div class="col-[2/4]">
    <p class="text-sm whitespace-pre-line">
      {user.description}
    </p>
  </div>
</a>
