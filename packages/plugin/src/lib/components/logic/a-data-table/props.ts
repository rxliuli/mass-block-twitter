import { type Component, type ComponentProps } from 'svelte'

class RenderComponentConfig<TComponent extends Component> {
  component: TComponent
  props: ComponentProps<TComponent> | Record<string, never>
  constructor(
    component: TComponent,
    props: ComponentProps<TComponent> | Record<string, never> = {},
  ) {
    this.component = component
    this.props = props
  }
}

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
  virtual?: boolean
  onScroll?: (event: UIEvent) => void
  loading?: boolean
}
