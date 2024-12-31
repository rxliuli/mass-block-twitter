<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import { type User } from '$lib/db'
  import { ShieldBan } from 'lucide-svelte'
  import { userMutation } from '../query'

  let user: User = $props()

  const mutation = userMutation()

  async function onBlock() {
    await $mutation.mutateAsync([user])
  }
</script>

<Button
  variant="outline"
  size="icon"
  disabled={user.blocking}
  title={user.blocking ? 'Blocked' : 'Block'}
  onclick={onBlock}
>
  <ShieldBan color={user.blocking ? 'red' : 'gray'} />
</Button>
