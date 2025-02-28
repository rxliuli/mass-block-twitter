import { Activity } from '$lib/db'
import dayjs, { Dayjs } from 'dayjs'
import { groupBy } from 'lodash-es'

export function formatActivity(now: Activity[], start: Dayjs, end: Dayjs) {
  const format = (activities: Activity[]) => {
    const group = groupBy(activities, (it) =>
      dayjs(it.created_at).format('MM-DD'),
    )
    const dates = []
    for (let date = start; date <= end; date = date.add(1, 'day')) {
      dates.push({
        date: date.format('MM-DD'),
        value: group[date.format('MM-DD')]?.length ?? 0,
      })
    }
    return dates
  }
  const auto = now.filter(
    (it) => it.action === 'block' && it.trigger_type === 'auto',
  )
  const manual = now.filter(
    (it) => it.action === 'block' && it.trigger_type === 'manual',
  )
  const hidden = now.filter((it) => it.action === 'hide')
  return {
    all: format(now),
    auto: format(auto),
    manual: format(manual),
    hidden: format(hidden),
  }
}
