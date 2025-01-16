<script lang="ts">
  import { type User } from '$lib/db'
  import { ShieldBan } from 'lucide-svelte'

  const { blocking }: Pick<User, 'blocking'> = $props()
</script>

<ShieldBan color={blocking ? 'red' : 'gray'} />
