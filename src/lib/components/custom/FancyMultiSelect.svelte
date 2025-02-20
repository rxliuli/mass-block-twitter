<script lang="ts" generics="T extends string | number">
  import { X } from 'lucide-svelte'
  import { Badge } from '$lib/components/ui/badge'
  import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
  } from '$lib/components/ui/command'
  import { tick } from 'svelte'

  interface LabelValue {
    value: T
    label: string
  }

  let {
    value = $bindable(),
    options,
  }: {
    value: T[]
    options: LabelValue[]
  } = $props()

  let open = $state(false)
  let inputValue = $state('')
  let inputEl: HTMLInputElement | undefined = $state()

  let selectables = $derived(
    options.filter((f) => !value.some((s) => s === f.value)),
  )

  function handleUnselect(item: LabelValue) {
    value = value.filter((s) => s !== item.value)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!inputEl) return

    if ((e.key === 'Delete' || e.key === 'Backspace') && inputValue === '') {
      value = value.slice(0, -1)
    }

    if (e.key === 'Escape') {
      inputEl.blur()
    }
  }

  async function handleSelect(item: LabelValue) {
    inputValue = ''
    value = [...value, item.value]
    await tick()
    inputEl?.focus()
  }

  const selected = $derived(
    options.filter((f) => value.some((s) => s === f.value)),
  )
</script>

<Command class="overflow-visible bg-transparent" onkeydown={handleKeyDown}>
  <div
    class="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
  >
    <div class="flex flex-wrap gap-1">
      {#each selected as item (item.value)}
        <Badge variant="secondary">
          {item.label}
          <button
            class="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onkeydown={(e) => e.key === 'Enter' && handleUnselect(item)}
            onmousedown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onclick={() => handleUnselect(item)}
          >
            <X class="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </Badge>
      {/each}
      <input
        bind:this={inputEl}
        bind:value={inputValue}
        onblur={() => (open = false)}
        onfocus={() => (open = true)}
        placeholder="Select frameworks..."
        class="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  </div>

  <div class="relative mt-2">
    <CommandList>
      {#if open && selectables.length > 0}
        <div
          class="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in"
        >
          <CommandGroup class="h-full overflow-auto">
            {#each selectables as framework (framework.value)}
              <CommandItem
                onmousedown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelect(framework)
                }}
                class="cursor-pointer"
              >
                {framework.label}
              </CommandItem>
            {/each}
          </CommandGroup>
        </div>
      {/if}
    </CommandList>
  </div>
</Command>
