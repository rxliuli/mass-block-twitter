import { render } from 'vitest-browser-svelte'
import { describe, expect, it } from 'vitest'
import Bindable2Writable from '../../test/Bindable2Writable.svelte'
import InputTest from './Input.test.svelte'
import { writable } from 'svelte/store'

describe('Input', () => {
  it('should render', async () => {
    const writableValue = writable('1')
    const screen = render(Bindable2Writable, {
      props: {
        component: InputTest as any,
        value: writableValue,
        title: 'input',
      },
      target: document.body,
    })
    console.log(
      'value: ',
      (screen.getByTitle('input').element() as HTMLInputElement).value,
    )
    // await expect.element(screen.getByTitle('input')).toHaveValue('1')
  })
})
