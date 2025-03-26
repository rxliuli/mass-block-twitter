import { PageTest } from '$lib/components/test'
import { toast } from 'svelte-sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, RenderResult } from 'vitest-browser-svelte'
import { tick } from 'svelte'

describe('toast', () => {
  afterEach(async () => {
    toast.dismiss()
    await tick()
  })
  it('should render', async () => {
    const screen = render(PageTest)
    toast.info('test')
    await expect.element(screen.getByText('test')).toBeInTheDocument()
  })
  it('should render close button', async () => {
    const screen = render(PageTest)
    toast.info('test')
    await screen.getByLabelText('Close toast').click()
    await expect.element(screen.getByText('test')).not.toBeInTheDocument()
  })
  describe('action/cancel/auto close', () => {
    let result: 'action' | 'cancel' | 'autoClose' | undefined
    const showToast = async () => {
      const toastId = toast.info('test', {
        action: {
          label: 'action',
          onClick: () => {
            result = 'action'
          },
        },
        cancel: {
          label: 'cancel',
          onClick: () => {
            result = 'cancel'
          },
        },
        onAutoClose: () => {
          result = 'autoClose'
        },
      })
      await tick()
      return toastId
    }
    let screen: RenderResult<any>
    beforeEach(() => {
      screen = render(PageTest)
      result = undefined
    })

    it('auto close', async () => {
      vi.useFakeTimers()
      await showToast()
      await vi.runAllTimersAsync()
      expect(result).toBe('autoClose')
    })
    it('action', async () => {
      await showToast()
      await screen.getByText('action').click()
      expect(result).toBe('action')
    })
    it('cancel', async () => {
      await showToast()
      await screen.getByText('cancel').click()
      expect(result).toBe('cancel')
    })
    it('close button', async () => {
      await showToast()
      await screen.getByLabelText('Close toast').click()
      expect(result).undefined
    })
    it('manual close', async () => {
      const toastId = await showToast()
      toast.dismiss(toastId)
      await tick()
      expect(result).undefined
    })
  })
})
