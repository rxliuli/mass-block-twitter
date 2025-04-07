<script lang="ts">
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  function showPrivacyPolicy() {
    if (localStorage.getItem('privacy-policy-accepted') === 'true') {
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
