import { toast } from 'svelte-sonner'

export async function confirmToast(
  title: string,
  options: {
    id: string | number
    description?: string
  },
) {
  return await new Promise<'stop' | 'continue'>((resolve) => {
    toast.info(title, {
      id: options.id,
      description: options.description,
      duration: 1000000,
      cancel: {
        label: 'Stop',
        onClick: () => {
          resolve('stop')
        },
      },
      action: {
        label: 'Continue',
        onClick: () => {
          resolve('continue')
        },
      },
      onDismiss: () => {
        resolve('stop')
      },
    })
  })
}
