<script lang="ts">
  import { type Tweet } from '$lib/db'

  // '[data-testid="cellInnerDiv"]:has([data-testid="reply"])',
  let { tweets }: { tweets: (Tweet & { user_screen_name: string })[] } =
    $props()
</script>

<div>
  {#each tweets as tweet}
    <div data-testid="cellInnerDiv">
      <a
        data-testid="reply"
        href={`https://x.com/${tweet.user_screen_name}/status/${tweet.id}`}
      >
        {tweet.text}
      </a>
    </div>
  {/each}
</div>
