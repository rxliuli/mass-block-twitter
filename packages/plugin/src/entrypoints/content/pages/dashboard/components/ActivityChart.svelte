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
  import { t } from '$lib/i18n'

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
      data: [
        $t('dashboard.stats.total'),
        $t('dashboard.stats.auto'),
        $t('dashboard.stats.manual'),
        $t('dashboard.stats.hidden'),
      ],
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
        name: $t('dashboard.stats.total'),
        type: 'line',
        data: data.all.map((it) => it.value),
      },
      {
        name: $t('dashboard.stats.auto'),
        type: 'line',
        data: data.auto.map((it) => it.value),
      },
      {
        name: $t('dashboard.stats.manual'),
        type: 'line',
        data: data.manual.map((it) => it.value),
      },
      {
        name: $t('dashboard.stats.hidden'),
        type: 'line',
        data: data.hidden.map((it) => it.value),
      },
    ],
  })
</script>

<Chart {options} {init} theme={$mode} />
