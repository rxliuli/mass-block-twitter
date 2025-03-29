import { PageTest } from '$lib/components/test'
import { render, RenderResult } from 'vitest-browser-svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import { tick } from 'svelte'
import { confirmToast } from '../confirmToast'

describe('confirmToast', () => {
  let screen: RenderResult<any>
  beforeEach(async () => {
    screen = render(PageTest)
    await tick()
  })
  it('should render', async () => {
    confirmToast('Are you sure?')
    await expect.element(screen.getByText('Are you sure?')).toBeInTheDocument()
    await expect.element(screen.getByText('Stop')).toBeInTheDocument()
  })
  it('should stop', async () => {
    const r = confirmToast('Are you sure?')
    await expect.element(screen.getByText('Are you sure?')).toBeInTheDocument()
    await expect.element(screen.getByText('Stop')).toBeInTheDocument()
    await screen.getByText('Stop').click()
    expect(await r).eq('stop')
  })
  it('should continue', async () => {
    const r = confirmToast('Are you sure?')
    await expect.element(screen.getByText('Are you sure?')).toBeInTheDocument()
    await expect.element(screen.getByText('Stop')).toBeInTheDocument()
    await screen.getByText('Continue').click()
    expect(await r).eq('continue')
  })
  it('should dismiss', async () => {
    const r = confirmToast('Are you sure?')
    await expect.element(screen.getByText('Are you sure?')).toBeInTheDocument()
    await screen.getByLabelText('Close toast').click()
    expect(await r).eq('stop')
  })
})
