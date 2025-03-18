import { toast } from 'svelte-sonner'
import { installExt } from './installExt'

export let ShowInstallToastFlag = false

export function showInstallToast() {
  toast.info('You haven’t installed the plugin yet, please install it', {
    action: {
      label: 'Install',
      onClick: installExt,
    },
    duration: 10000,
  })
  ShowInstallToastFlag = true
}
