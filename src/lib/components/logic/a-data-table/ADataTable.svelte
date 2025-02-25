<script lang="ts" generics="TData extends any">
  import { Checkbox } from '$lib/components/ui/checkbox'
  import { difference, uniq } from 'lodash-es'
  import type { Props } from './props'
  import { isComponent, isComponentConfig, isSnippetConfig } from './utils'
  import { getVirtualizedRange } from './virtual'
  import { onMount, tick } from 'svelte'
  import { Loader2Icon } from 'lucide-svelte'
  import { AutoSizer } from '@rxliuli/svelte-window'

  const props: Props<TData> = $props()

  const allSelected = $derived(
    props.dataSource.length !== 0 &&
      props.rowSelection?.selectedRowKeys.length === props.dataSource.length,
  )
  function toggleAllSelection(checked: boolean) {
    if (checked) {
      props.rowSelection!.onChange(
        props.dataSource.map((it) => it[props.rowKey as keyof TData] as string),
        props.dataSource,
      )
    } else {
      props.rowSelection!.onChange([], [])
    }
  }
  function toggleSelection(key: string, row: TData, checked: boolean) {
    if (checked) {
      props.rowSelection!.onChange(
        uniq([...props.rowSelection!.selectedRowKeys, key]),
        uniq([...props.dataSource, row]),
      )
    } else {
      props.rowSelection!.onChange(
        difference(props.rowSelection!.selectedRowKeys, [key]),
        difference(props.dataSource, [row]),
      )
    }
  }

  let tableRef = $state<HTMLElement>()
  let scrollTop = $state(0)
  let itemHeight = $state(40)
  let measuredHeights = $state<Record<number, number>>({})

  $effect(() => {
    measuredHeights = {}
    itemHeight = 40
  })

  function handleTrMount(element: HTMLElement, globalIndex: number) {
    const height = element.offsetHeight
    if (measuredHeights[globalIndex] === undefined) {
      measuredHeights[globalIndex] = height

      const heights = Object.values(measuredHeights)
      if (heights.length > 0) {
        itemHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length
      }
    }
  }

  const rangeData = $derived.by(() => {
    if (!props.virtual) {
      return {
        start: 0,
        end: props.dataSource.length,
        data: props.dataSource,
        paddingTop: 0,
        paddingBottom: 0,
      }
    }
    const viewportHeight = tableRef?.clientHeight ?? window.innerHeight
    const count = props.dataSource.length
    const r = getVirtualizedRange({
      itemHeight,
      count,
      viewportHeight,
      top: scrollTop,
    })
    return {
      ...r,
      data: props.dataSource.slice(r.start, r.end),
    }
  })

  onMount(() => {
    if (!tableRef) {
      return
    }
    const observer = new ResizeObserver(async () => {
      await tick()
      scrollTop += 1
    })
    observer.observe(tableRef)
    return () => {
      observer.disconnect()
    }
  })

  const handleScroll = (event: UIEvent) => {
    const target = event.target as HTMLTableElement
    const top = target.scrollTop
    requestAnimationFrame(() => {
      scrollTop = top
    })
    props.onScroll?.(event as UIEvent)
  }
</script>

<div class="relative h-full overflow-x-auto" onscroll={handleScroll}>
  <AutoSizer>
    {#snippet child({ height })}
      <table
        bind:this={tableRef}
        class={'table-auto border-b border-collapse border-gray-400 w-full'}
        style="height: {height}px"
      >
        <thead class="text-muted-foreground sticky top-0 bg-background z-10">
          <tr>
            {#if props.rowSelection}
              <th class="table-cell selection">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAllSelection}
                />
              </th>
            {/if}
            {#each props.columns as column (column.dataIndex)}
              <th class="table-cell">{column.title}</th>
            {/each}
          </tr>
        </thead>

        <tbody>
          {#if props.virtual}
            <tr style="height: {rangeData.paddingTop}px"></tr>
          {/if}
          {#each rangeData.data as row, localIndex (row[props.rowKey as keyof TData] ?? localIndex)}
            {@const globalIndex = rangeData.start + localIndex}
            <tr
              onload={(ev) =>
                handleTrMount(ev.target as HTMLElement, globalIndex)}
              data-id={row[props.rowKey as keyof TData] as any}
              class="border-b border-gray-300 hover:bg-muted/50 group"
            >
              {#if props.rowSelection}
                {@const key = row[props.rowKey as keyof TData] as any}
                <td class="table-cell selection">
                  <Checkbox
                    checked={props.rowSelection.selectedRowKeys.includes(key)}
                    onCheckedChange={(checked) =>
                      toggleSelection(key, row, checked)}
                  />
                </td>
              {/if}
              {#each props.columns as column (column.dataIndex)}
                <td class="table-cell">
                  {#if column.render}
                    {@const RenderResult = column.render(
                      row[column.dataIndex as keyof TData],
                      row,
                      localIndex,
                    )}
                    {#if isComponentConfig(RenderResult)}
                      <RenderResult.component {...RenderResult.props} />
                    {:else if isComponent(RenderResult)}
                      <RenderResult />
                    {:else if isSnippetConfig(RenderResult)}
                      {@const snippet = RenderResult.snippet}
                      {@const params = RenderResult.params}
                      {@render snippet(params)}
                    {:else}
                      {RenderResult}
                    {/if}
                  {:else}
                    {row[column.dataIndex as keyof TData]}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
          {#if props.virtual}
            <tr style="height: {rangeData.paddingBottom}px"></tr>
          {/if}
        </tbody>
      </table>
    {/snippet}
  </AutoSizer>
  {#if props.loading}
    <div class="sticky bottom-0 flex items-center justify-center p-2 z-10">
      <div
        class="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm"
      >
        <Loader2Icon class="w-6 h-6 animate-spin text-primary" />
      </div>
    </div>
  {/if}
</div>

<style>
  .table-cell {
    @apply h-10 px-2 text-left align-middle  left-0 bg-background group-hover:bg-muted/50;
  }
  .table-cell.selection {
    @apply sticky left-0;
  }
</style>
