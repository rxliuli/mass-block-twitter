<script lang="ts">
  import {
    Avatar,
    AvatarImage,
    AvatarFallback,
  } from '$lib/components/ui/avatar'
  import type { ModListUser } from '@mass-block-twitter/server'
  import type { Snippet } from 'svelte'

  const props: {
    user: ModListUser & {
      screenName: string
      name: string
      profileImageUrl?: string
      description?: string
    }
    actions?: Snippet
  } = $props()
</script>

<div
  class="w-full max-w-2xl p-4 rounded-lg bg-zinc-950 grid grid-cols-[auto_1fr_auto] gap-3"
>
  <Avatar class="h-12 w-12">
    <AvatarImage src={props.user.profileImageUrl} alt={props.user.name} />
    <AvatarFallback>ML</AvatarFallback>
  </Avatar>
  <div class="flex flex-col">
    <h2 class="font-semibold text-base">{props.user.name}</h2>
    <p class="text-sm text-zinc-400">{props.user.screenName}</p>
  </div>

  <div>{@render props.actions?.()}</div>

  <div class="col-[2/4]">
    <p class="text-sm whitespace-pre-line">
      {props.user.description}
    </p>
  </div>
</div>
