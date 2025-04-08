<script lang="ts">
  import type { EChartsOption } from 'echarts'
  import { init, use } from 'echarts/core'
  import { Chart } from '$lib/components/chart'
  import type { Activity } from '$lib/db'
  import { groupBy } from 'es-toolkit'
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
  import { getRulesMap } from '../utils/stats'

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
    const ruleMap = getRulesMap()
    const group = groupBy(activities, (it) => it.match_filter)
    return Object.entries(group)
      .map(([key, value]) => ({
        name: $t(ruleMap[key as Activity['match_filter']]) ?? 'Other',
        count: value.length,
      }))
      .filter((it) => it.count > 0)
      .sort((a, b) => a.count - b.count)
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
