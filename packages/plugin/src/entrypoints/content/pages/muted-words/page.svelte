<script lang="ts">
  import { MUTED_WORD_RULES_KEY, MUTED_WORDS_KEY } from '$lib/api'
  import LayoutNav from '$lib/components/layout/LayoutNav.svelte'
  import { Button } from '$lib/components/ui/button'
  import { localStorageAdapter, localStore } from '$lib/util/localStore'
  import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-svelte'
  import WordRuleEdit from './components/WordRuleEdit.svelte'
  import { ulid } from 'ulidx'
  import { getMutedWordRules, type MutedWordRule } from '$lib/filter'
  import { useAuthInfo } from '$lib/hooks/useAuthInfo.svelte'
  import { toast } from 'svelte-sonner'
  import { t } from '$lib/i18n'

  let rules = localStore<MutedWordRule[]>(
    MUTED_WORD_RULES_KEY,
    getMutedWordRules(),
    localStorageAdapter(),
  )

  function newRule(): MutedWordRule {
    return {
      id: ulid(),
      keyword: '',
      type: 'hide',
      checkpoints: ['name', 'screen_name', 'description', 'location', 'tweet'],
    }
  }

  let editState = $state<{
    open: boolean
    rule: MutedWordRule
    index?: number
  }>({
    open: false,
    rule: newRule(),
  })
  const authInfo = useAuthInfo()
  function onAddKeyword() {
    if ($rules.length >= 400 && !authInfo.value?.isPro) {
      toast.info($t('muted-words.toast.limit.title'), {
        description: $t('muted-words.toast.limit.description'),
        action: {
          label: $t('muted-words.toast.limit.action'),
          onClick: () => {
            window.open('https://mass-block-twitter.rxliuli.com/pricing')
          },
        },
      })
      return
    }
    editState.open = true
    editState.index = undefined
    editState.rule = newRule()
  }
  function onEditKeyword(index: number) {
    editState.open = true
    editState.index = index
    editState.rule = $state.snapshot($rules[index])
  }

  function onDeleteKeyword(index: number) {
    $rules = $rules.filter((_, i) => i !== index)
  }

  function onUpdate(rule: MutedWordRule) {
    if (editState.index === undefined) {
      $rules = [rule, ...$rules]
    } else {
      $rules = $rules.map((r, i) => (i === editState.index ? rule : r))
    }
    editState.open = false
  }
</script>

<LayoutNav>
  {#snippet children()}
    <Button variant="ghost" size={'icon'} onclick={onAddKeyword}>
      <PlusIcon class="w-4 h-4" />
    </Button>
  {/snippet}
</LayoutNav>

<div class="max-w-3xl mx-auto">
  <p class="text-sm text-gray-500 mb-2">
    {$t('muted-words.description')}
  </p>
  <ul class="flex flex-col divide-y divide-muted">
    {#each $rules as rune, index}
      <li
        class="flex items-center justify-between gap-2 py-3 hover:bg-muted/50 cursor-pointer"
      >
        <div class="flex-1 flex flex-col">
          <span class="font-medium">{rune.keyword}</span>
          <span class="text-sm text-muted-foreground"
            >{rune.type === 'hide' ? $t('muted-words.actions.hide') : $t('muted-words.actions.block')}</span
          >
        </div>
        <Button
          variant="ghost"
          size="icon"
          onclick={() => onEditKeyword(index)}
        >
          <PencilIcon class="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onclick={() => onDeleteKeyword(index)}
        >
          <TrashIcon class="w-4 h-4" />
        </Button>
      </li>
    {/each}
  </ul>
</div>

<WordRuleEdit
  bind:open={editState.open}
  bind:rule={editState.rule}
  {onUpdate}
  title={editState.index ? $t('muted-words.modal.edit.title') : $t('muted-words.modal.create.title')}
/>
