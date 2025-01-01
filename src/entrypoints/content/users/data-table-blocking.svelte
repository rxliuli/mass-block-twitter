<script lang="ts">
  import { type User } from '$lib/db'
  import { ShieldBan } from 'lucide-svelte'
  let user: User = $props()
</script>

<ShieldBan color={user.blocking ? 'red' : 'gray'} />
