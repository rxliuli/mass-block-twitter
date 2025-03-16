<script lang="ts">
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  function showPrivacyPolicy() {
    if (localStorage.getItem('privacy-policy-accepted') === 'true') {
      return
    }
    toast.info('Privacy Policy Updated', {
      description: 'Last Updated: 2025-03-16',
      action: {
        label: 'View',
        onClick: () => {
          window.open(
            'https://mass-block-twitter.rxliuli.com/docs/privacy',
            '_blank',
          )
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
