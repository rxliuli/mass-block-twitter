<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import type { ModList } from '@mass-block-twitter/server'
  import { UserPlusIcon } from 'lucide-svelte'

  const props: {
    modlist: ModList & {
      subscribed: boolean
      owner: boolean
      twitterScreenName: string
    }
  } = $props()
</script>

<div class="w-full bg-zinc-950 p-4">
  <div class="max-w-3xl mx-auto">
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
            Moderation list by {props.modlist.owner
              ? 'you'
              : props.modlist.twitterScreenName}
          </p>
        </div>
      </div>
    </div>
    <p class="text-base leading-relaxed max-w-3xl">
      {props.modlist.description}
    </p>
    <div class="flex justify-end">
      <Button variant="ghost" class="text-blue-400 flex items-center gap-2">
        <UserPlusIcon class="h-4 w-4" />
        Add people
      </Button>
    </div>
  </div>
</div>
