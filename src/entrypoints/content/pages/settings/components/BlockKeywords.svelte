<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Label } from '$lib/components/ui/label'
  import { localStorageAdapter, localStore } from '$lib/util/localStore'
  import { TrashIcon } from 'lucide-svelte'

  let keywords = localStore(
    'MASS_BLOCK_TWITTER_BLOCK_KEYWORDS',
    localStorage
      .getItem('blockKeywords')
      ?.split('\n')
      .filter((it) => !!it) ?? [],
    localStorageAdapter(),
  )
  function onAddKeyword() {
    const keyword = prompt('Enter a keyword to block')
    if (!keyword) {
      return
    }
    $keywords = [...$keywords, keyword]
  }

  function onDeleteKeyword(index: number) {
    $keywords = $keywords.filter((_, i) => i !== index)
  }
</script>

<div>
  <Label class="block mb-2">Block Keywords</Label>
  <ul class="flex flex-col gap-2">
    {#each $keywords as keyword, index}
      <li class="flex items-center justify-between gap-2">
        <span>{keyword}</span>
        <Button
          variant="destructive"
          size="icon"
          onclick={() => onDeleteKeyword(index)}
        >
          <TrashIcon class="w-4 h-4" />
        </Button>
      </li>
    {/each}
  </ul>
  <Button variant="secondary" onclick={onAddKeyword}>Add Keyword</Button>
</div>
