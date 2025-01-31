<script lang="ts" generics="TData extends any">
  import * as Table from '$lib/components/ui/table'
  import { Checkbox } from '../../ui/checkbox'
  import { difference, uniq } from 'lodash-es'
  import type { Props } from './props'
  import { isComponent, isComponentConfig } from './utils'

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
</script>

<Table.Root class={props.class}>
  <Table.Header class="sticky top-0 bg-background z-10">
    <Table.Row>
      {#if props.rowSelection}
        <Table.Head class="whitespace-nowrap">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAllSelection}
          />
        </Table.Head>
      {/if}
      {#each props.columns as column (column.dataIndex)}
        <Table.Head class="whitespace-nowrap">{column.title}</Table.Head>
      {/each}
    </Table.Row>
  </Table.Header>

  <Table.Body class="h-full overflow-y-auto">
    {#each props.dataSource as row, index (row[props.rowKey as keyof TData] ?? index)}
      <Table.Row>
        {#if props.rowSelection}
          <Table.Cell>
            {@const key = row[props.rowKey as keyof TData] as any}
            <Checkbox
              checked={props.rowSelection.selectedRowKeys.includes(key)}
              onCheckedChange={(checked) => toggleSelection(key, row, checked)}
            />
          </Table.Cell>
        {/if}
        {#each props.columns as column (column.dataIndex)}
          <Table.Cell>
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
          </Table.Cell>
        {/each}
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>
