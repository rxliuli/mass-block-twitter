import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-svelte'
import { Slider } from '..'
import { get, writable } from 'svelte/store'

describe('Slider', () => {
  it('should render', async () => {
    const value = writable(0)
    const screen = render(Slider, {
      value: get(value),
      onValueChange: (v: number) => value.set(v),
    })
    const slider = screen.getByRole('slider')
    await expect.element(slider).toBeInTheDocument()
  })
  it.todo('should render single slider with bind:value')
  it.todo('should render range slider with bind:value')
  it.todo('should render disabled slider')
  it.todo('should render slider with custom min and max and step')
})
