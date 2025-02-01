<script lang="ts">
  import { MUTED_WORDS_KEY } from '$lib/api'
  import { Button } from '$lib/components/ui/button'
  import { localStorageAdapter, localStore } from '$lib/util/localStore'
  import { TrashIcon } from 'lucide-svelte'

  let keywords = localStore(
    MUTED_WORDS_KEY,
    localStorage
      .getItem('blockKeywords')
      ?.split('\n')
      .filter((it) => !!it) ?? [],
    localStorageAdapter(),
  )
  function onAddKeyword() {
    const keyword = prompt('Enter a keywords to block, separated by commas')
    if (!keyword) {
      return
    }
    $keywords = [
      ...$keywords,
      ...keyword
        .split(/[,，]/)
        .map((it) => it.trim())
        .filter((it) => !!it),
    ]
  }

  function onDeleteKeyword(index: number) {
    $keywords = $keywords.filter((_, i) => i !== index)
  }
</script>

<div>
  <p class="text-sm text-gray-500 mb-2">
    When you block keywords, posts containing these keywords will be hidden,
    including tweets where the keywords appear in usernames, bios, or tweet
    content. This applies to both timeline and replies.
  </p>
  <Button variant="secondary" onclick={onAddKeyword}>Add Keyword</Button>
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
</div>
