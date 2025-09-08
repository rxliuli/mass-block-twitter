<script lang="ts">
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  async function showPrivacyPolicy() {
    const local = browser.storage.local
    // TODO: 兼容旧的 localStorage
    if (localStorage.getItem('privacy-policy-accepted') === 'true') {
      await local.set({
        privacyPolicyAccepted: true,
      })
      return
    }
    const { privacyPolicyAccepted } = await local.get('privacyPolicyAccepted')
    if (privacyPolicyAccepted) {
      return
    }
    toast.info('Privacy Policy', {
      description:
        'By continuing to use this extension, you agree to our privacy policy.',
      action: {
        label: 'View',
        onClick: () => {
          window.open(
            'https://mass-block-twitter.rxliuli.com/docs/privacy',
            '_blank',
          )
          local.set({
            privacyPolicyAccepted: true,
          })
        },
      },
      duration: Number.POSITIVE_INFINITY,
      onDismiss: () => {
        local.set({
          privacyPolicyAccepted: true,
        })
      },
    })
  }

  onMount(() => {
    showPrivacyPolicy()
  })
</script>
