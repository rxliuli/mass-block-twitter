<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import type { Activity } from '$lib/db'
  import dayjs from 'dayjs'
  import * as Avatar from '$lib/components/ui/avatar'
  import { t } from '$lib/i18n'

  const { activity }: { activity: Activity } = $props()

  const actionMap = {
    block: {
      label: $t('dashboard.recentActivities.block'),
      color: 'destructive',
    },
    hide: { label: $t('dashboard.recentActivities.hide'), color: 'secondary' },
  } as const

  const ruleMap: Record<Activity['match_filter'], string> = $derived({
    mutedWords: $t('dashboard.rules.mutedWords'),
    modList: $t('dashboard.rules.modList'),
    blueVerified: $t('dashboard.rules.blueVerified'),
    defaultProfile: $t('dashboard.rules.defaultProfile'),
    sharedSpam: $t('dashboard.rules.sharedSpam'),
    language: $t('dashboard.rules.language'),
    batchSelected: $t('dashboard.rules.batchSelected'),
  })
  const triggerMap: Record<Activity['trigger_type'], string> = $derived({
    auto: $t('dashboard.recentActivities.trigger.auto'),
    manual: $t('dashboard.recentActivities.trigger.manual'),
  })
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
        {dayjs(activity.created_at).format('MM-DD HH:mm')}
      </div>
      <Badge
        variant={actionMap[activity.action].color}
        class="w-14 text-center truncate"
      >
        {actionMap[activity.action].label}
      </Badge>
    </div>
    <div class="text-sm flex items-center">
      <span class="text-muted-foreground"
        >{$t('dashboard.recentActivities.rule.title')}:</span
      >
      <span class="inline-block w-24 truncate"
        >{ruleMap[activity.match_filter]}</span
      >
      <span class="text-muted-foreground mx-1">·</span>
      <span class="text-muted-foreground"
        >{$t('dashboard.recentActivities.trigger.title')}:</span
      >
      <span class="inline-block w-24 truncate"
        >{triggerMap[activity.trigger_type]}</span
      >
    </div>
  </div>

  <div class="text-sm">
    <span class="text-muted-foreground"
      >{$t('dashboard.recentActivities.action.title')}:</span
    >
    <span class="font-medium">
      {#if activity.action === 'block'}
        {$t('dashboard.recentActivities.details.block')}
      {:else if activity.action === 'hide'}
        {$t('dashboard.recentActivities.details.hide')}
      {:else}
        {$t('dashboard.recentActivities.details.performed')}
      {/if}
    </span>
  </div>
</div>
