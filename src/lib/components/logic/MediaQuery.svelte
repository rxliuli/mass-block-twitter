<script lang="ts">
  import { onMount, type Snippet, untrack } from 'svelte'

  let { query, children } = $props<{
    query: string
    children: Snippet<[matches: boolean]>
  }>()

  let mql: MediaQueryList | null = null
  let mqlListener: ((v: MediaQueryListEvent) => void) | null = null
  let wasMounted = $state(false)
  let matches = $state(false)

  onMount(() => {
    wasMounted = true
    return () => {
      removeActiveListener()
    }
  })

  function addNewListener(query: string) {
    mql = window.matchMedia(query)
    mqlListener = (v) => (matches = v.matches)
    mql.addEventListener('change', mqlListener)
    matches = mql.matches
  }

  function removeActiveListener() {
    if (mql && mqlListener) {
      mql.removeEventListener('change', mqlListener)
    }
  }
  $effect(() => {
    if (wasMounted) {
      untrack(() => {
        removeActiveListener()
        addNewListener(query)
      })
    }
  })
</script>

{@render children?.(matches)}
