<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { ArrowLeftIcon } from 'lucide-svelte'
  import { router } from './route.svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Textarea } from '$lib/components/ui/textarea'

  let keywords = $state(localStorage.getItem('blockKeywords') ?? '')
  function onInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement
    keywords = textarea.value
    localStorage.setItem('blockKeywords', keywords)
  }
</script>

<Dialog.Header class="mb-0">
  <Dialog.Title>
    <Button variant="ghost" size="icon" onclick={() => (router.path = '/')}>
      <ArrowLeftIcon class="w-4 h-4" />
    </Button>
    Settings
  </Dialog.Title>
</Dialog.Header>
<div>
  <Textarea
    placeholder="Place auto block keywords, one per line"
    rows={3}
    value={keywords}
    oninput={onInput}
  />
  <!-- <div>
    <p>If you like this plugin, you can buy me a coffee.</p>
    <a href="https://mass-block-twitter.rxliuli.com/sponsor.html"
      >☕️ Buy me a coffee</a
    >
  </div> -->
</div>
