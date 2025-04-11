import { render } from 'vitest-browser-svelte'
import { describe, expect, it, vi } from 'vitest'
import { InputSearch } from '..'
import { get, writable } from 'svelte/store'
import { userEvent } from '@vitest/browser/context'
import { wait } from '@liuli-util/async'

describe('InputSearch', () => {
  it('should render', async () => {
    const screen = render(InputSearch, {
      value: 'test',
      title: 'test-input',
    })
    await expect.element(screen.getByTitle('test-input')).toBeInTheDocument()
  })
  it('should bindable', async () => {
    const value = writable('')
    const screen = render(InputSearch, {
      get value() {
        return get(value)
      },
      set value(v: string) {
        value.set(v)
      },
      title: 'test-input',
    })
    const input = screen.getByTitle('test-input')
    await expect.element(input).toBeInTheDocument()
    await userEvent.type(input, 'hello world')
    expect(get(value)).toBe('hello world')
  })
  it('should onchange', async () => {
    const value = writable('')
    const onchange = vi.fn()
    const screen = render(InputSearch, {
      get value() {
        return get(value)
      },
      set value(v: string) {
        value.set(v)
      },
      title: 'test-input',
      onchange,
    })
    const input = screen.getByTitle('test-input')
    await userEvent.type(input, 'hello world')
    await wait(500)
    expect(onchange).toHaveBeenCalledWith('hello world')
  })
})
