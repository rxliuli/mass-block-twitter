import { RenderComponentConfig } from '$lib/components/ui/data-table/render-helpers'
import { Component } from 'svelte'

export type Column<T> = {
  title: string
  dataIndex: keyof T | string
  render?: (
    value: any,
    record: T,
    index: number,
  ) => string | Component | RenderComponentConfig<any>
}

export type RowSelection<TData> = {
  selectedRowKeys: string[]
  onChange: (selectedRowKeys: string[], selectedRows: TData[]) => void
}

export type Props<TData> = {
  columns: Column<TData>[]
  dataSource: TData[]
  rowKey?: string
  class?: string
  rowSelection?: RowSelection<TData>
}
