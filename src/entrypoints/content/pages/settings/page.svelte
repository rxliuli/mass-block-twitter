<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { ArrowLeftIcon } from 'lucide-svelte'
  import { router } from '../../../../lib/route.svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Label } from '$lib/components/ui/label/index.js'
  import PageHeader from '$lib/components/logic/PageHeader.svelte'

  let keywords = $state(localStorage.getItem('blockKeywords') ?? '')
  function onInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement
    keywords = textarea.value
    localStorage.setItem('blockKeywords', keywords)
  }
</script>

<PageHeader>
  <Button variant="ghost" size="icon" onclick={() => (router.path = '/')}>
    <ArrowLeftIcon class="w-4 h-4" />
  </Button>
  Settings
</PageHeader>
<div class="flex flex-col gap-4">
  <div>
    <Label class="block mb-2">Auto Block Keywords</Label>
    <Textarea
      placeholder="Place auto block keywords, one per line"
      rows={3}
      value={keywords}
      oninput={onInput}
    />
  </div>
</div>
