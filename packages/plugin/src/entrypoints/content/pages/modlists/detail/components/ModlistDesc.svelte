<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar'
  import type { ModListGetResponse } from '@mass-block-twitter/server'
  import type { Snippet } from 'svelte'

  const props: {
    modlist: ModListGetResponse
    actions: Snippet
  } = $props()
</script>

<div class="w-full bg-zinc-950 p-4">
  <div class="flex items-start justify-between">
    <div class="flex gap-4">
      <Avatar.Root>
        <Avatar.Image src={props.modlist.avatar} alt={props.modlist.name} />
        <Avatar.Fallback>
          {props.modlist.name.slice(0, 2)}
        </Avatar.Fallback>
      </Avatar.Root>
      <div class="flex flex-col">
        <h1 class="text-2xl font-semibold text-white">
          {props.modlist.name}
        </h1>
        <p class="text-zinc-400">
          Moderation list by
          <a
            href={`https://x.com/${props.modlist.twitterUser.screenName}`}
            target="_blank"
            class="text-blue-500"
          >
            @{props.modlist.twitterUser.screenName}
          </a>
        </p>
      </div>
    </div>
  </div>
  <p class="text-base leading-relaxed max-w-3xl">
    {props.modlist.description}
  </p>
  <div class="flex justify-end pt-4">
    {@render props.actions()}
  </div>
</div>
