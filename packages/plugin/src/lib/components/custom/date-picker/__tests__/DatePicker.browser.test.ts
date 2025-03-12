import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { DatePicker } from '..'
import { get, writable } from 'svelte/store'
import { tick } from 'svelte'
import dayjs from 'dayjs'

describe('DatePicker', () => {
  it('should render', async () => {
    const value = writable<Date>()
    const screen = render(DatePicker, {
      get value() {
        return get(value)
      },
      set value(v) {
        value.set(v)
      },
    })
    await expect.element(screen.getByText('Pick a date')).toBeInTheDocument()
    await screen.getByText('Pick a date').click()
    const selected = dayjs().add(1, 'day')
    screen.baseElement
      ?.querySelector<HTMLElement>(
        `[data-value="${selected.format('YYYY-MM-DD')}"]`,
      )
      ?.click()
    await new Promise((resolve) => setTimeout(resolve, 100))

    console.log(screen.baseElement)
    // console.log(screen.getByText('2025-01-01').element())
    // await expect.element(screen.getByText('2025-01-01')).toBeInTheDocument()
  })
})
