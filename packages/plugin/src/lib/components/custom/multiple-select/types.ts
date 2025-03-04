export interface MultipleSelectRootContext {
  selected: string[]
  mode: 'checked' | 'unchecked' | 'indeterminate'
  click: (key: string) => void
  selectAll: () => void
}
