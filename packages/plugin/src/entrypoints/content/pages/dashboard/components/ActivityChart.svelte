<script lang="ts">
  import type { Activity } from '$lib/db'
  import { Chart } from '$lib/components/chart'
  import type { EChartsOption } from 'echarts'
  import { init, use } from 'echarts/core'
  import { formatActivity } from '../utils/activity'
  import { Dayjs } from 'dayjs'
  import { mode } from 'mode-watcher'
  import { SVGRenderer } from 'echarts/renderers'
  import { LineChart } from 'echarts/charts'
  import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
  } from 'echarts/components'

  use([
    SVGRenderer,
    LineChart,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
  ])

  const {
    activities,
    range,
  }: { activities: Activity[]; range: { from: Dayjs; to: Dayjs } } = $props()

  const data = $derived(formatActivity(activities, range.from, range.to))

  const options = $derived<EChartsOption>({
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: ['Total', 'Auto Blocked', 'Manual Blocked', 'Hidden Tweets'],
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.all.map((it) => it.date),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name: 'Total',
        type: 'line',
        data: data.all.map((it) => it.value),
      },
      {
        name: 'Auto Blocked',
        type: 'line',
        data: data.auto.map((it) => it.value),
      },
      {
        name: 'Manual Blocked',
        type: 'line',
        data: data.manual.map((it) => it.value),
      },
      {
        name: 'Hidden Tweets',
        type: 'line',
        data: data.hidden.map((it) => it.value),
      },
    ],
  })
</script>

<Chart {options} {init} theme={$mode} />
