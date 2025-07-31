<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar'
  import type { ModListGetResponse } from '@mass-block-twitter/server'
  import type { Snippet } from 'svelte'
  import { t } from '$lib/i18n'
  import { UsersIcon, FilterIcon } from 'lucide-svelte'

  const props: {
    modlist: ModListGetResponse
    actions: Snippet
  } = $props()
</script>

<div class="w-full py-4">
  <div class="flex flex-col md:flex-row items-start justify-between mb-2">
    <div class="flex gap-4">
      <Avatar.Root>
        <Avatar.Image src={props.modlist.avatar} alt={props.modlist.name} />
        <Avatar.Fallback>
          {props.modlist.name.slice(0, 2)}
        </Avatar.Fallback>
      </Avatar.Root>
      <div class="flex flex-col">
        <h1 class="text-2xl font-semibold">
          {props.modlist.name}
        </h1>
        <p>
          {$t('modlists.detail.desc.by')}
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

    <!-- Stats section -->
    <div class="flex flex-row md:flex-col gap-4 md:gap-2">
      <div class="flex items-center gap-2">
        <UsersIcon class="h-4 w-4" />
        <span
          >{props.modlist.userCount ?? 0}
          {$t('modlists.detail.stats.users')}</span
        >
      </div>
      <div class="flex items-center gap-2">
        <FilterIcon class="h-4 w-4" />
        <span
          >{props.modlist.ruleCount} {$t('modlists.detail.stats.rules')}</span
        >
      </div>
    </div>
  </div>
  <p class="text-base leading-relaxed max-w-3xl">
    {props.modlist.description}
  </p>

  {@render props.actions()}
</div>
