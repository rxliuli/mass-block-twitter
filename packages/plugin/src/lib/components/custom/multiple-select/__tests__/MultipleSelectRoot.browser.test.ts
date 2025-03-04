import { describe, expect, it } from 'vitest'
import MultipleSelectRootTest from './MultipleSelectRoot.test.svelte'
import { render } from 'vitest-browser-svelte'
import { get, writable } from 'svelte/store'
import { tick } from 'svelte'

describe('MultipleSelect', () => {
  it('should be select', async () => {
    const selected = writable([])
    const screen = render(MultipleSelectRootTest, {
      props: {
        selected,
        keys: ['1', '2', '3'],
      },
      target: document.body,
    })
    await screen.getByTitle('1').click()
    expect(get(selected)).toEqual(['1'])
    await screen.getByTitle('2').click()
    expect(get(selected)).toEqual(['1', '2'])
    await screen.getByTitle('3').click()
    expect(get(selected)).toEqual(['1', '2', '3'])
    await screen.getByTitle('1').click()
    expect(get(selected)).toEqual(['2', '3'])
  })
  it('should be range select', async () => {
    const selected = writable(['1', '2', '3'])
    const screen = render(MultipleSelectRootTest, {
      props: {
        selected,
        keys: ['1', '2', '3', '4', '5'],
      },
      target: document.body,
    })
    await screen.getByTitle('1').click()
    screen.container.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }),
    )
    await screen.getByTitle('3').click()
    expect(get(selected)).toEqual(['1', '2', '3'])
    screen.container.dispatchEvent(
      new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        shiftKey: false,
      }),
    )
    await screen.getByTitle('5').click()
    expect(get(selected)).toEqual(['1', '2', '3', '5'])
  })
  it('should be set selected in external', async () => {
    const selected = writable([])
    const screen = render(MultipleSelectRootTest, {
      props: {
        selected,
        keys: ['1', '2', '3', '4', '5'],
      },
      target: document.body,
    })
    await screen.getByTitle('1').click()
    expect(get(selected)).toEqual(['1'])
    await screen.getByTitle('2').click()
    expect(get(selected)).toEqual(['1', '2'])
    selected.set([])
    expect(get(selected)).toEqual([])
    await screen.getByTitle('1').click()
    expect(get(selected)).toEqual(['1'])
  })
  it('should be select reverse', async () => {
    const selected = writable(['1', '2', '3'])
    const screen = render(MultipleSelectRootTest, {
      props: {
        selected,
        keys: ['1', '2', '3', '4', '5'],
      },
      target: document.body,
    })
    await screen.getByTitle('1').click()
    screen.container.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }),
    )
    await screen.getByTitle('5').click()
    expect(get(selected)).toEqual(['1', '2', '3', '4', '5'])
    await screen.getByTitle('3').click()
    expect(get(selected)).toEqual(['1', '2', '3'])
  })
  it('should be select all', async () => {
    const selected = writable([])
    const screen = render(MultipleSelectRootTest, {
      props: {
        selected,
        keys: ['1', '2', '3', '4', '5'],
      },
      target: document.body,
    })
    await expect
      .element(screen.getByTitle('selectAllLabel'))
      .toHaveTextContent('unchecked')
    await screen.getByTitle('selectAllCheckbox').click()
    expect(get(selected)).toEqual(['1', '2', '3', '4', '5'])
    await expect
      .element(screen.getByTitle('selectAllLabel'))
      .toHaveTextContent('checked')
    await screen.getByTitle('1').click()
    expect(get(selected)).toEqual(['2', '3', '4', '5'])
    await expect
      .element(screen.getByTitle('selectAllLabel'))
      .toHaveTextContent('indeterminate')
    await screen.getByTitle('2').click()
    await screen.getByTitle('3').click()
    await screen.getByTitle('4').click()
    await screen.getByTitle('5').click()
    await expect
      .element(screen.getByTitle('selectAllLabel'))
      .toHaveTextContent('unchecked')
    expect(get(selected)).toEqual([])
  })
  it('should be async load keys', async () => {
    const selected = writable([])
    const screen = render(MultipleSelectRootTest, {
      props: {
        selected,
        keys: [],
      },
      target: document.body,
    })
    await tick()
    await screen.rerender({
      keys: ['1', '2', '3', '4', '5'],
    })
    await screen.getByTitle('1').click()
    expect(get(selected)).toEqual(['1'])
  })
})
