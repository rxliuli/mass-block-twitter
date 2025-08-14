<script lang="ts">
  import SelectGroup from '$lib/components/custom/select/SelectGroup.svelte'
  import { Input } from '$lib/components/ui/input'
  import { Label } from '$lib/components/ui/label'
  import { getRuleFileds } from '$lib/rule'
  import { cn } from '$lib/utils'
  import type { ModListConditionItem } from '@mass-block-twitter/server'
  import type { Snippet } from 'svelte'
  import { capitalCase } from 'change-case'
  import { Switch } from '$lib/components/ui/switch'
  import { t } from '$lib/i18n'
  import { Checkbox } from '$lib/components/ui/checkbox'

  let {
    value: condition = $bindable(),
    actions,
    name,
    first,
    hasOne,
  }: {
    value: Partial<ModListConditionItem>
    actions: Snippet
    name: string
    first?: boolean
    hasOne?: boolean
  } = $props()

  const fields = getRuleFileds()

  const fieldOptions = fields.map((it) => ({
    label: capitalCase(it.field),
    value: it.field,
  }))

  const getField = (field?: string) => fields.find((it) => it.field === field)
  const field = $derived(getField(condition.field))
</script>

<div class="flex flex-col py-2 md:py-0 md:flex-row items-center gap-2">
  <div class="w-full md:w-48 px-1">
    <Label for={`${name}.field`} class={cn({ 'md:hidden': !first })}>
      {$t('modlists.detail.rule.form.condition.field.label')}
    </Label>
    <SelectGroup
      name={`${name}.field`}
      bind:value={condition.field}
      onChange={(value) => {
        const newField = getField(value)
        if (newField?.type === 'boolean') {
          condition.operator = 'eq'
          condition.value = true
        } else {
          condition.operator = undefined
          condition.value = undefined
        }
      }}
      options={fieldOptions}
      required
    />
  </div>
  <div class="w-full md:w-48 px-1">
    <Label for={`${name}.operator`} class={cn({ 'md:hidden': !first })}>
      {$t('modlists.detail.rule.form.condition.operator.label')}
    </Label>
    <div class="flex items-center gap-2">
      <SelectGroup
        name={`${name}.operator`}
        bind:value={condition.operator}
        options={field?.operator ?? []}
        disabled={!field}
        required
      />
      {#if field?.type === 'string'}
        <Checkbox
          checked={condition.caseSensitive ?? false}
          onCheckedChange={(checked) => {
            condition.caseSensitive = checked
          }}
          title="Case Sensitive"
          class="ml-2"
          disabled={!condition.operator}
        />
      {/if}
    </div>
  </div>
  <div class="w-full md:flex-1 px-1">
    <Label for={`${name}.value`} class={cn({ 'md:hidden': !first })}>
      {$t('modlists.detail.rule.form.condition.value.label')}
    </Label>
    {#if field}
      {#if field.type === 'string'}
        {#if field.enum}
          <SelectGroup
            name={`${name}.value`}
            bind:value={condition.value as string}
            options={field.enum}
            disabled={!condition.operator}
            required
          />
        {:else}
          <Input
            name={`${name}.value`}
            bind:value={condition.value as string}
            onchange={(ev) => {
              condition.value = (ev.target as HTMLInputElement).value.trim()
            }}
            disabled={!condition.operator}
            required
          />
        {/if}
      {:else if field.type === 'number'}
        <Input
          type="number"
          name={`${name}.value`}
          bind:value={condition.value as number}
          disabled={!condition.operator}
          required
        />
      {:else if field.type === 'boolean'}
        <div class="flex h-10 items-center gap-2">
          <Switch
            name={`${name}.value`}
            bind:checked={condition.value as boolean}
            disabled={!condition.operator}
            required
          />
        </div>
      {/if}
    {:else}
      <Input disabled required />
    {/if}
  </div>
  <div class={cn('hidden md:flex items-center gap-2', first && 'pt-6')}>
    {@render actions()}
  </div>
</div>
