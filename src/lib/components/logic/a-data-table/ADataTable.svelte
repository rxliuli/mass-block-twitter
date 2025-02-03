<script lang="ts" generics="TData extends any">
  import { Checkbox } from '$lib/components/ui/checkbox'
  import { difference, uniq } from 'lodash-es'
  import type { Props } from './props'
  import { isComponent, isComponentConfig } from './utils'
  import { getVirtualizedRange } from './virtual'
  import { cn } from '$lib/utils'
  import { tick } from 'svelte'

  // @link https://ant.design/components/table
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

  const rangeData = $derived.by(() => {
    if (!props.virtual) {
      return {
        data: props.dataSource,
        paddingTop: 0,
        paddingBottom: 0,
      }
    }
    const viewportHeight = tableRef?.clientHeight ?? window.innerHeight
    const itemHeight = 42 // TODO magic number
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

  const handleScroll = (event: Event) => {
    const target = event.target as HTMLTableElement
    const top = target.scrollTop
    requestAnimationFrame(() => {
      scrollTop = top
    })
  }
</script>

<div
  bind:this={tableRef}
  class={cn('max-h-screen overflow-auto', props.class)}
  onscroll={handleScroll}
>
  <table class={'table-auto border border-collapse border-gray-400 w-full'}>
    <thead class="border border-gray-300 sticky top-0 bg-background z-10">
      <tr>
        {#if props.rowSelection}
          <th
            class="border border-gray-300 px-4 text-left whitespace-nowrap sticky left-0 bg-background"
          >
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAllSelection}
            />
          </th>
        {/if}
        {#each props.columns as column (column.dataIndex)}
          <th class="border border-gray-300 px-4 text-left whitespace-nowrap"
            >{column.title}</th
          >
        {/each}
      </tr>
    </thead>

    <tbody class="h-full overflow-y-auto">
      {#if props.virtual}
        <tr style="height: {rangeData.paddingTop}px"></tr>
      {/if}
      {#each rangeData.data as row, index (row[props.rowKey as keyof TData] ?? index)}
        <tr data-id={row[props.rowKey as keyof TData] as any}>
          {#if props.rowSelection}
            {@const key = row[props.rowKey as keyof TData] as any}
            <td
              class="border border-gray-300 px-4 whitespace-nowrap sticky left-0 bg-background"
            >
              <Checkbox
                checked={props.rowSelection.selectedRowKeys.includes(key)}
                onCheckedChange={(checked) =>
                  toggleSelection(key, row, checked)}
              />
            </td>
          {/if}
          {#each props.columns as column (column.dataIndex)}
            <td class="border border-gray-300 px-4 whitespace-nowrap">
              {#if column.render}
                {@const RenderResult = column.render(
                  row[column.dataIndex as keyof TData],
                  row,
                  index,
                )}
                {#if isComponentConfig(RenderResult)}
                  <RenderResult.component {...RenderResult.props} />
                {:else if isComponent(RenderResult)}
                  <RenderResult />
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
</div>
