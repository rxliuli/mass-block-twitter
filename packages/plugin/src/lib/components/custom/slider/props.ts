export interface SingleProps {
  range?: false
  value?: number
  onValueChange?: (value: number) => void
}

export interface RangeProps {
  range: true
  value?: [number, number]
  onValueChange?: (value: [number, number]) => void
}
