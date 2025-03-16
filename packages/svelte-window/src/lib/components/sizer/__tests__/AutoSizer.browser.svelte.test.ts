import { render } from 'vitest-browser-svelte'
import { describe, expect, it } from 'vitest'
import AutoSizerDemo from './AutoSizer.demo.svelte'

describe('AutoSizer', () => {
  it('should render', async () => {
    const screen = render(AutoSizerDemo)
    await expect.element(screen.getByTitle('test-parent')).toBeInTheDocument()
    await expect
      .element(screen.getByTitle('test-child'))
      .not.toBeInTheDocument()
    ;(screen.getByTitle('test-parent').element() as HTMLElement).style.width =
      '400px'
    ;(screen.getByTitle('test-parent').element() as HTMLElement).style.height =
      '400px'
    await expect.element(screen.getByTitle('test-child')).toBeInTheDocument()
    await expect.element(screen.getByTitle('test-child')).toHaveStyle({
      width: '400px',
      height: '400px',
    })
  })
})
