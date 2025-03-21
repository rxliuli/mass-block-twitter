import { render } from 'vitest-browser-svelte'
import UseLocationDemo from './useLocation.test.svelte'
import { describe, expect, it } from 'vitest'

describe('useLocation', async () => {
  it('history.pushState', async () => {
    const screen = render(UseLocationDemo)
    await expect.element(screen.getByText(location.href)).toBeInTheDocument()
    history.pushState(null, '', location.href + '#test')
    await expect
      .element(screen.getByText(location.href))
      .not.toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await expect.element(screen.getByText(location.href)).toBeInTheDocument()
  })
  it('history.replaceState', async () => {
    const screen = render(UseLocationDemo)
    await expect.element(screen.getByText(location.href)).toBeInTheDocument()
    history.replaceState(null, '', location.href + '#test')
    await expect
      .element(screen.getByText(location.href))
      .not.toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await expect.element(screen.getByText(location.href)).toBeInTheDocument()
  })
  it.skip('history.popState', async () => {
    const screen = render(UseLocationDemo)
    await expect.element(screen.getByText(location.href)).toBeInTheDocument()
    const originHref = location.href
    history.pushState(null, '', originHref + '#test')
    await expect
      .element(screen.getByText(location.href))
      .not.toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await expect.element(screen.getByText(location.href)).toBeInTheDocument()
    history.back()
    expect(history.length).eq(originHref)
    await expect
      .element(screen.getByText(originHref, { exact: true }))
      .not.toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await expect
      .element(screen.getByText(originHref, { exact: true }))
      .toBeInTheDocument()
  })
  it('hashchange', async () => {
    const screen = render(UseLocationDemo)
    await expect.element(screen.getByText(location.href)).toBeInTheDocument()
    location.href += '#test'
    await expect
      .element(screen.getByText(location.href))
      .not.toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await expect.element(screen.getByText(location.href)).toBeInTheDocument()
  })
})
