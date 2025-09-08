import { tP } from '$lib/i18n'
import { toast } from 'svelte-sonner'

export async function confirmToast(
  title: string,
  options?: {
    id?: string | number
    description?: string
  },
) {
  return await new Promise<'stop' | 'continue'>((resolve) => {
    toast.info(title, {
      id: options?.id,
      description: options?.description,
      duration: Number.POSITIVE_INFINITY,
      cancel: {
        label: tP('common.actions.stop'),
        onClick: () => {
          resolve('stop')
        },
      },
      action: {
        label: tP('common.actions.continue'),
        onClick: () => {
          resolve('continue')
        },
      },
      onAutoClose: () => {
        resolve('stop')
      },
      onDismiss: () => {
        resolve('stop')
      },
    })
  })
}
