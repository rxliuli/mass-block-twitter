<script lang="ts">
  import { type User } from '$lib/db'
  import { ShieldBan } from 'lucide-svelte'
  import { userMutation } from '../query'

  let user: User = $props()

  const mutation = userMutation()

  async function onBlock() {
    await $mutation.mutateAsync([user])
  }
</script>

<ShieldBan color={user.blocking ? 'red' : 'gray'} />
