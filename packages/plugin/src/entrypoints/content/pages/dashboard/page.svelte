<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card'
  import { Avatar } from '$lib/components/ui/avatar'
  import { Separator } from '$lib/components/ui/separator'
  import ActivityChart from './components/ActivityChart.svelte'
  import RulesBarChart from './components/RulesBarChart.svelte'
  import dayjs from 'dayjs'
  import { createQuery } from '@tanstack/svelte-query'
  import { type Activity, dbApi } from '$lib/db'
  import { groupBy, sortBy } from 'lodash-es'
  import { calcStats, formatStats } from './utils/stats'
  import { RouterLink } from '$lib/components/logic/router'
  import { t } from '$lib/i18n'

  let dateRange = {
    from: dayjs().subtract(1, 'week'),
    to: dayjs(),
  }

  const query = createQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      return dbApi.activitys.getByRange(
        dateRange.from.subtract(1, 'week').toDate(),
        dateRange.to.toDate(),
      )
    },
  })
  const { now, before } = $derived.by(() => {
    const data = $query.data ?? []
    const { true: now = [], before = [] } = groupBy(
      data,
      (it) => it.created_at >= dateRange.from.toISOString(),
    )
    return { now, before }
  })

  const stats = $derived.by(() => formatStats(calcStats(now, before)))

  const recentActivities = $derived.by(() => {
    const actionMap: Record<Activity['action'], string> = {
      block: $t('dashboard.recentActivities.block'),
      hide: $t('dashboard.recentActivities.hide'),
    }
    const matchTypeMap: Record<Activity['match_type'], string> = {
      tweet: $t('dashboard.recentActivities.tweet'),
      user: $t('dashboard.recentActivities.user'),
    }
    const ruleMap: Record<Activity['match_filter'], string> = {
      blueVerified: $t('dashboard.recentActivities.blueVerified'),
      defaultProfile: $t('dashboard.recentActivities.defaultProfile'),
      modList: $t('dashboard.recentActivities.modList'),
      mutedWords: $t('dashboard.recentActivities.mutedWords'),
      sharedSpam: $t('dashboard.recentActivities.sharedSpam'),
      language: $t('dashboard.recentActivities.language'),
      batchSelected: $t('dashboard.recentActivities.batchSelected'),
    }
    return sortBy(now, (it) => -new Date(it.created_at).getTime())
      .slice(0, 4)
      .map((it) => ({
        name: it.user_name,
        username: it.user_screen_name,
        action: actionMap[it.action] + ' ' + matchTypeMap[it.match_type],
        rule: ruleMap[it.match_filter],
        date: dayjs(it.created_at).format('MM-DD HH:mm'),
      }))
  })
</script>

<div class="grid gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
  {#each stats as stat}
    <Card>
      <CardHeader
        class="flex flex-row items-center justify-between space-y-0 pb-2"
      >
        <CardTitle class="text-sm font-medium">{$t(stat.title)}</CardTitle>
        <div
          class="rounded-full w-8 h-8 flex items-center justify-center bg-muted"
        >
          {stat.icon}
        </div>
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-bold">{stat.value}</div>
        <p class="text-xs text-muted-foreground flex items-center mt-1">
          {#if stat.trend === 'up'}
            <span class="text-green-500">{stat.change}</span>
          {:else}
            <span class="text-red-500">{stat.change}</span>
          {/if}
          <span class="ml-1">{$t(stat.period)}</span>
        </p>
      </CardContent>
    </Card>
  {/each}
</div>

<Card class="mb-8">
  <CardHeader>
    <CardTitle>{$t('dashboard.activity.title')}</CardTitle>
  </CardHeader>
  <CardContent class="h-[300px] pt-4">
    <ActivityChart activities={now} range={dateRange} />
  </CardContent>
</Card>

<div class="grid gap-4 md:grid-cols-2">
  <Card>
    <CardHeader>
      <CardTitle>{$t('dashboard.rules.title')}</CardTitle>
    </CardHeader>
    <CardContent class="h-72">
      <RulesBarChart activities={now} />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>{$t('dashboard.recentActivities.title')}</CardTitle>
    </CardHeader>
    <CardContent class="px-2">
      <div class="space-y-4">
        {#each recentActivities as activity, i}
          <div class="flex items-center gap-4 px-2">
            <Avatar class="h-9 w-9">
              <div
                class="flex h-full w-full items-center justify-center bg-muted"
              >
                👤
              </div>
            </Avatar>
            <div class="space-y-1">
              <p class="text-sm font-medium leading-none">
                <a
                  href={`https://x.com/${activity.username}`}
                  target="_blank"
                  class="text-blue-500"
                >
                  {activity.username}
                </a>
                {activity.action}
              </p>
              <p class="text-sm text-muted-foreground">
                ({activity.rule}) {activity.date}
              </p>
            </div>
          </div>
          {#if i < recentActivities.length - 1}
            <Separator />
          {/if}
        {/each}

        <div class="flex justify-center pt-2">
          <RouterLink href="/dashboard/activities">
            <Button variant="outline" size="sm">{$t('dashboard.recentActivities.viewAll')}</Button>
          </RouterLink>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
