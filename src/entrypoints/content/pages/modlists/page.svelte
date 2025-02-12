<script lang="ts">
  import { useAuthInfo } from '$lib/hooks/useAuthInfo'
  import { toast } from 'svelte-sonner'
  import LayoutNav from '../../../../lib/components/layout/LayoutNav.svelte'
  import { navigate } from '$lib/components/logic/router'
  import Button from '$lib/components/ui/button/button.svelte'

  const authInfo = useAuthInfo()

  function onNew() {
    if (!authInfo) {
      toast.info('You must be logged in to create a modlist')
      return
    }
    const name = prompt('Enter a name for your new modlist')
    if (!name) {
      return
    }
    console.log(name)
  }

  function onGotoMyModlists() {
    if (!authInfo) {
      toast.info('You must be logged in to create a modlist')
      return
    }
    navigate(`/modlists/user?userId=${$authInfo?.id}`)
  }
</script>

<LayoutNav>
  <Button variant="link" size="sm" class="h-7" onclick={onGotoMyModlists}>
    My Modlists
  </Button>
</LayoutNav>
