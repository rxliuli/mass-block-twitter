<script lang="ts">
  import { type Writable } from 'svelte/store'
  import MultipleSelectRoot from '../MultipleSelectRoot.svelte'
  import MultipleSelectCheckbox from '../MultipleSelectCheckbox.svelte'
  import MultipleSelectAll from '../MultipleSelectAll.svelte'

  let {
    selected,
    keys,
  }: {
    selected: Writable<string[]>
    keys: string[]
  } = $props()
</script>

<MultipleSelectRoot bind:selected={$selected} {keys}>
  <MultipleSelectAll>
    {#snippet child({ mode, onclick })}
      <div>
        <input
          type="checkbox"
          {onclick}
          name="all"
          id="all"
          title="selectAllCheckbox"
        />
        <label for="all" title="selectAllLabel">{mode}</label>
      </div>
    {/snippet}
  </MultipleSelectAll>
  {#each keys as key}
    <MultipleSelectCheckbox {key}>
      {#snippet child({ checked, onclick })}
        <input type="checkbox" {checked} {onclick} title={key} />
      {/snippet}
    </MultipleSelectCheckbox>
  {/each}
</MultipleSelectRoot>
