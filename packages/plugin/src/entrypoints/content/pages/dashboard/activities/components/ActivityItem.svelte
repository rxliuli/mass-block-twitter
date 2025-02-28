<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import type { Activity } from '$lib/db'
  import dayjs from 'dayjs'
  import * as Avatar from '$lib/components/ui/avatar'

  const { activity }: { activity: Activity } = $props()

  const actionMap = {
    block: { label: 'Block', color: 'destructive' },
    hide: { label: 'Hide', color: 'secondary' },
  } as const

  const ruleMap: Record<Activity['match_filter'], string> = {
    mutedWords: 'Muted Words',
    modList: 'Mod List',
    blueVerified: 'Blue Verified',
    defaultProfile: 'Default Profile',
    sharedSpam: 'Shared Spam',
    language: 'Language',
    batchSelected: 'Batch Selected',
  }
  const triggerMap: Record<Activity['trigger_type'], string> = {
    auto: 'Auto',
    manual: 'Manual',
  }
</script>

<div class="py-2">
  <div class="flex items-center justify-between gap-2 flex-wrap">
    <Avatar.Root class="w-10 h-10">
      <Avatar.Image src={activity.user_profile_image_url} />
      <Avatar.Fallback>
        {activity.user_name.slice(0, 2)}
      </Avatar.Fallback>
    </Avatar.Root>

    <div class="flex-1">
      <div class="font-medium">{activity.user_name}</div>
      <div class="text-sm text-muted-foreground">
        <a
          href={`https://x.com/${activity.user_screen_name}`}
          target="_blank"
          class="text-blue-500"
        >
          @{activity.user_screen_name}
        </a>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div class="text-sm text-muted-foreground">
        {dayjs(activity.created_at).format('YYYY-MM-DD HH:mm:ss')}
      </div>
      <Badge variant={actionMap[activity.action].color}>
        {actionMap[activity.action].label}
      </Badge>
    </div>
    <div class="text-sm">
      <span class="text-muted-foreground">Rule:</span>
      <span>{ruleMap[activity.match_filter]}</span>
      <span class="text-muted-foreground mx-1">·</span>
      <span class="text-muted-foreground">Trigger:</span>
      <span>{triggerMap[activity.trigger_type]}</span>
    </div>
  </div>

  <div class="text-sm">
    <span class="text-muted-foreground">Action:</span>
    <span class="font-medium">
      {#if activity.action === 'block'}
        Blocked this account
      {:else if activity.action === 'hide'}
        Hidden this account's tweets
      {:else}
        Performed an action
      {/if}
    </span>
  </div>
</div>
