<script lang="ts">
  import type {
    ModListAddRuleRequest,
    ModListConditionItem,
  } from '@mass-block-twitter/server'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { shadcnConfig } from '$lib/components/logic/config'
  import ModlistRuleConditionEdit from './ModlistRuleConditionEdit.svelte'
  import { Badge } from '$lib/components/ui/badge'
  import { Trash2Icon, XIcon } from 'lucide-svelte'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { cn } from '$lib/utils'

  let {
    open = $bindable(false),
    rule = $bindable(),
    onSave,
  }: {
    open: boolean
    rule: ModListAddRuleRequest
    onSave: () => void
  } = $props()

  function onCancel() {
    open = false
  }
  let formRef = $state<HTMLFormElement>()
  function onSubmit() {
    if (!formRef?.checkValidity()) {
      formRef?.reportValidity()
      return
    }
    onSave()
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="w-full max-w-3xl px-0"
    portalProps={{ to: shadcnConfig.get().portal }}
    trapFocus={false}
  >
    <Dialog.Header class="px-4">
      <Dialog.Title>
        {rule ? 'Edit Rule' : 'Add Rule'}
      </Dialog.Title>
    </Dialog.Header>
    <form bind:this={formRef} class="h-[60dvh] px-4 overflow-y-auto">
      <div>
        <Label for="name">Name</Label>
        <Input id="name" name="name" bind:value={rule.name} required />
        <p class="text-sm text-muted-foreground">
          Give your rule a descriptive name.
        </p>
      </div>
      {#each rule.rule.or as or, orIndex (orIndex)}
        {#each or.and as _, andIndex (andIndex)}
          {@const hasOne =
            rule.rule.or.length === 1 && or.and.length === 1}
          <div
            class={cn(
              'flex md:hidden items-center justify-end gap-2',
              hasOne && 'hidden',
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onclick={() => {
                or.and.splice(andIndex, 1)
                if (or.and.length === 0) {
                  rule.rule.or.splice(orIndex, 1)
                }
              }}
            >
              <Trash2Icon class="w-4 h-4" />
            </Button>
          </div>
          <ModlistRuleConditionEdit
            name={`or.${orIndex}.and.${andIndex}`}
            bind:value={or.and[andIndex]}
            first={andIndex === 0 && orIndex === 0}
            {hasOne}
          >
            {#snippet actions()}
              <Button
                variant="secondary"
                onclick={() => {
                  or.and.splice(andIndex + 1, 0, {} as ModListConditionItem)
                }}
              >
                And
              </Button>
              {#if andIndex === or.and.length - 1}
                <Button
                  variant="secondary"
                  onclick={() => {
                    rule.rule.or.splice(orIndex + 1, 0, {
                      and: [{} as ModListConditionItem],
                    })
                  }}
                >
                  Or
                </Button>
              {/if}
              {#if !hasOne}
                <Button
                  variant="secondary"
                  size="icon"
                  onclick={() => {
                    or.and.splice(andIndex, 1)
                    if (or.and.length === 0) {
                      rule.rule.or.splice(orIndex, 1)
                    }
                  }}
                >
                  <Trash2Icon />
                </Button>
              {/if}
            {/snippet}
          </ModlistRuleConditionEdit>
          {#if andIndex !== or.and.length - 1}
            <div class="flex md:w-fit flex-col items-center">
              <div class="h-2 border-l"></div>
              <Badge>And</Badge>
              <div class="h-2 border-l"></div>
            </div>
          {/if}
          {#if orIndex === rule.rule.or.length - 1 && andIndex === or.and.length - 1}
            <div class="md:hidden">
              <Button
                variant="secondary"
                onclick={() => {
                  or.and.splice(andIndex + 1, 0, {} as ModListConditionItem)
                }}
              >
                And
              </Button>
              <Button
                variant="secondary"
                onclick={() => {
                  rule.rule.or.splice(orIndex + 1, 0, {
                    and: [{} as ModListConditionItem],
                  })
                }}
              >
                Or
              </Button>
            </div>
          {/if}
        {/each}
        {#if orIndex !== rule.rule.or.length - 1}
          <div class="flex w-fit flex-col items-center">
            <div class="h-4"></div>
            <Badge>Or</Badge>
            <div class="h-4"></div>
          </div>
        {/if}
      {/each}
    </form>

    <Dialog.Footer class="px-4">
      <Button variant="secondary" onclick={onCancel}>Cancel</Button>
      <Button onclick={onSubmit}>Save</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
