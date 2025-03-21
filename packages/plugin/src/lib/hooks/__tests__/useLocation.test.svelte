<script lang="ts">
  import { useLocation } from '../useLocation.svelte'
  const location = useLocation()
</script>

<div>
  <p>url:{location.url?.href}</p>
</div>
