import { describe, expect, it } from 'vitest'
import { calcStats } from '../stats'
import { Activity } from '$lib/db'
import { formatActivity } from '../activity'
import dayjs from 'dayjs'

describe('calcStats', () => {
  it('should calc stats', () => {
    const now = [
      { action: 'block', trigger_type: 'auto' },
      { action: 'block', trigger_type: 'manual' },
      { action: 'hide', trigger_type: 'auto' },
    ] as Activity[]
    const before = [
      { action: 'block', trigger_type: 'auto' },
      { action: 'block', trigger_type: 'manual' },
    ] as Activity[]
    const stats = calcStats(now, before)
    expect(stats).toEqual({
      auto: { change: '0%', value: 1 },
      hidden: { change: '+100%', value: 1 },
      manual: { change: '0%', value: 1 },
      total: { change: '+50%', value: 3 },
    })
  })

  it('should calc stats with 0 change', () => {
    const now = [
      { action: 'block', trigger_type: 'auto' },
      { action: 'block', trigger_type: 'manual' },
    ] as Activity[]
    const before = [] as Activity[]
    const stats = calcStats(now, before)
    expect(stats).toEqual({
      auto: { change: '+100%', value: 1 },
      hidden: { change: '0%', value: 0 },
      manual: { change: '+100%', value: 1 },
      total: { change: '+100%', value: 2 },
    })
  })
})

describe('formatActivity', () => {
  it('should format activity', () => {
    const start = dayjs('2024-01-01')
    const end = dayjs('2024-01-07')
    const now = [
      {
        action: 'block',
        trigger_type: 'auto',
        match_filter: 'modList',
        created_at: '2024-01-01',
      },
      {
        action: 'hide',
        trigger_type: 'auto',
        match_filter: 'blueVerified',
        created_at: '2024-01-02',
      },
      {
        action: 'block',
        trigger_type: 'manual',
        match_filter: 'batchSelected',
        created_at: '2024-01-03',
      },
      {
        action: 'hide',
        trigger_type: 'auto',
        match_filter: 'blueVerified',
        created_at: '2024-01-04',
      },
    ] as Activity[]
    const activity = formatActivity(now, start, end)
    expect(activity.all).length(7)
    expect(activity.all.filter((it) => it.value !== 0)).length(4)
    expect(activity.auto.filter((it) => it.value !== 0)).length(1)
    expect(activity.manual.filter((it) => it.value !== 0)).length(1)
    expect(activity.hidden.filter((it) => it.value !== 0)).length(2)
  })
})
