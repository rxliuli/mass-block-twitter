<script lang="ts">
  import type { ModListRule } from '@mass-block-twitter/server'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { shadcnConfig } from '$lib/components/logic/config'
  import { Badge } from '$lib/components/ui/badge'
  import { Label } from '$lib/components/ui/label'
  import { getRuleFileds } from '$lib/rule'
  import { capitalCase } from 'change-case'
  import { SelectGroup } from '$lib/components/custom/select'
  import { Input } from '$lib/components/ui/input'
  import { Switch } from '$lib/components/ui/switch'
  import { cn } from '$lib/utils'
  import { t } from '$lib/i18n'

  let { open = $bindable(), rule }: { open: boolean; rule?: ModListRule } =
    $props()

  const fields = getRuleFileds()

  const fieldOptions = fields.map((it) => ({
    label: capitalCase(it.field),
    value: it.field,
  }))
</script>

<Dialog.Root bind:open>
  <Dialog.Content
    class="w-full max-w-3xl"
    portalProps={{ to: shadcnConfig.get().portal }}
  >
    <Dialog.Header>
      <Dialog.Title>{$t('modlists.detail.rules.preview.title', { values: { name: rule?.name } })}</Dialog.Title>
    </Dialog.Header>
    <div class="h-[60dvh] overflow-y-auto">
      {#if rule}
        {#each rule.rule.or as or, orIndex (orIndex)}
          {#each or.and as condition, andIndex (andIndex)}
            {@const first = andIndex === 0}
            {@const field = fields.find((it) => it.field === condition.field)}
            {@const name = `condition.or.${orIndex}.and.${andIndex}`}
            <div class="flex flex-col md:flex-row items-center gap-2">
              <div class="w-full md:w-48 px-1">
                <Label for={`${name}.field`} class={cn({ 'md:hidden': !first })}
                  >{$t('modlists.detail.rules.preview.field')}</Label
                >
                <SelectGroup
                  name={`${name}.field`}
                  value={condition.field}
                  options={fieldOptions}
                  disabled={true}
                />
              </div>
              <div class="w-full md:w-36 px-1">
                <Label
                  for={`${name}.operator`}
                  class={cn({ 'md:hidden': !first })}
                >
                  {$t('modlists.detail.rules.preview.operator')}
                </Label>
                <SelectGroup
                  name={`${name}.operator`}
                  value={condition.operator}
                  options={field?.operator ?? []}
                  disabled={true}
                />
              </div>
              <div class="w-full md:flex-1 px-1">
                <Label
                  for={`${name}.value`}
                  class={cn({ 'md:hidden': !first })}
                >
                  {$t('modlists.detail.rules.preview.value')}
                </Label>
                {#if field}
                  {#if field.type === 'string'}
                    {#if field.enum}
                      <SelectGroup
                        name={`${name}.value`}
                        value={condition.value as string}
                        options={field.enum}
                        disabled={true}
                        required
                      />
                    {:else}
                      <Input
                        name={`${name}.value`}
                        value={condition.value as string}
                        disabled={true}
                        required
                      />
                    {/if}
                  {:else if field.type === 'number'}
                    <Input
                      type="number"
                      name={`${name}.value`}
                      value={condition.value as number}
                      disabled={true}
                      required
                    />
                  {:else if field.type === 'boolean'}
                    <div class="flex h-10 items-center gap-2">
                      <Switch
                        name={`${name}.value`}
                        checked={condition.value as boolean}
                        disabled={true}
                        required
                      />
                    </div>
                  {/if}
                {:else}
                  <Input disabled required />
                {/if}
              </div>
            </div>
            {#if andIndex !== or.and.length - 1}
              <div class="flex w-fit flex-col items-center">
                <div class="h-2 border-l"></div>
                <Badge>{$t('modlists.detail.rules.preview.and')}</Badge>
                <div class="h-2 border-l"></div>
              </div>
            {/if}
          {/each}
          {#if orIndex !== rule.rule.or.length - 1}
            <div class="flex w-fit flex-col items-center">
              <div class="h-4"></div>
              <Badge>{$t('modlists.detail.rules.preview.or')}</Badge>
              <div class="h-4"></div>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
    <Dialog.Footer>
      <Button variant="secondary" onclick={() => (open = false)}>{$t('modlists.detail.rules.preview.close')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
