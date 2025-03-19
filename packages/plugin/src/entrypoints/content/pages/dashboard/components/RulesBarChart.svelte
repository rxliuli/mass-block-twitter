<script lang="ts">
  import type { EChartsOption } from 'echarts'
  import { init, use } from 'echarts/core'
  import { Chart } from '$lib/components/chart'
  import type { Activity } from '$lib/db'
  import { groupBy } from 'lodash-es'
  import { mode } from 'mode-watcher'
  import { SVGRenderer } from 'echarts/renderers'
  import { BarChart } from 'echarts/charts'
  import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
  } from 'echarts/components'
  import { t } from '$lib/i18n'

  use([
    SVGRenderer,
    BarChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
  ])

  const { activities }: { activities: Activity[] } = $props()

  const data = $derived.by(() => {
    const ruleMap: Record<Activity['match_filter'], string> = {
      mutedWords: $t('dashboard.rules.mutedWords'),
      modList: $t('dashboard.rules.modList'),
      blueVerified: $t('dashboard.rules.blueVerified'),
      defaultProfile: $t('dashboard.rules.defaultProfile'),
      sharedSpam: $t('dashboard.rules.sharedSpam'),
      language: $t('dashboard.rules.language'),
      batchSelected: $t('dashboard.rules.batchSelected'),
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
