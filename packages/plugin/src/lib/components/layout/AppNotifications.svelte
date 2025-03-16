<script lang="ts">
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  function showPrivacyPolicy() {
    if (localStorage.getItem('privacy-policy-accepted') === 'true') {
      return
    }
    toast.info('Privacy Policy Update: New Data Collection', {
      description:
        'We now collect additional usage data to improve our service, including interaction patterns and feature usage. Your data is anonymized and never shared with third parties. Click "View" for the full privacy policy.',
      action: {
        label: 'View',
        onClick: () => {
          window.open(
            'https://mass-block-twitter.rxliuli.com/docs/privacy',
            '_blank',
          )
          localStorage.setItem('privacy-policy-accepted', 'true')
        },
      },
      duration: 1000000,
      onDismiss: () => {
        localStorage.setItem('privacy-policy-accepted', 'true')
      },
    })
  }

  onMount(() => {
    showPrivacyPolicy()
  })
</script>
