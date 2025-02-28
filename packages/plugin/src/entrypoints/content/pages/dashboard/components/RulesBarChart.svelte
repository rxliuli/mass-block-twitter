<script lang="ts">
  import type { EChartsOption } from 'echarts'
  import { init } from 'echarts'
  import { Chart } from '$lib/components/chart'
  import type { Activity } from '$lib/db'
  import { groupBy } from 'lodash-es'
  import { mode } from 'mode-watcher'

  const { activities }: { activities: Activity[] } = $props()

  const data = $derived.by(() => {
    const ruleMap: Record<Activity['match_filter'], string> = {
      mutedWords: 'Muted Words',
      modList: 'Mod List',
      blueVerified: 'Blue Verified',
      defaultProfile: 'Default Profile',
      sharedSpam: 'Shared Spam',
      language: 'Language',
      batchSelected: 'Batch Selected',
    }
    const group = groupBy(activities, (it) => it.match_filter)
    return Object.entries(group)
      .map(([key, value]) => ({
        name: ruleMap[key as Activity['match_filter']] ?? 'Other',
        count: value.length,
      }))
      .filter((it) => it.count > 0)
  })

  const options: EChartsOption = $derived({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {},
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01],
    },
    yAxis: {
      type: 'category',
      data: data.map((it) => it.name),
    },
    series: [
      {
        data: data.map((it) => it.count),
        type: 'bar',
      },
    ],
  })
</script>

<Chart {options} {init} theme={$mode} />
