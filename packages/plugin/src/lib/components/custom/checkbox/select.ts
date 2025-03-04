import { uniq } from 'lodash-es'

function order(a: number, b: number): [number, number] {
  return a > b ? [b, a] : [a, b]
}

export class Selector {
  #selected: string[] = []
  #keys: string[]
  constructor(keys: string[]) {
    this.#keys = keys
  }
  #lastKey?: string
  #mode: 'add' | 'remove' = 'add'
  #shiftKey = false
  #range?: {
    start: string
    end: string
  }
  get mode() {
    return this.#mode
  }
  shiftDown() {
    this.#shiftKey = true
  }
  shiftUp() {
    this.#shiftKey = false
    this.#selected = this.selected
    this.#range = undefined
    this.#lastKey = undefined
  }
  get selected() {
    if (!this.#range) {
      return this.#selected
    }
    const map = this.#keys.reduce((acc, it, index) => {
      acc[it] = index
      return acc
    }, {} as Record<string, number>)
    const [startIndex, endIndex] = order(
      map[this.#range.start],
      map[this.#range.end],
    )
    const rangeKeys = this.#keys.slice(startIndex, endIndex + 1)
    if (this.#mode === 'add') {
      return uniq([...this.#selected, ...rangeKeys])
    }
    return this.#selected.filter((it) => !rangeKeys.includes(it))
  }
  click(key: string) {
    const included = this.#selected.includes(key)
    if (!this.#shiftKey) {
      this.#selected = included
        ? this.#selected.filter((k) => k !== key)
        : [...this.#selected, key]
      if (!this.#lastKey) {
        this.#mode = included ? 'remove' : 'add'
        this.#lastKey = key
      }
      return
    }
    if (!this.#range) {
      this.#range = {
        start: this.#lastKey ?? key,
        end: key,
      }
      if (!this.#lastKey) {
        this.#mode = included ? 'remove' : 'add'
        this.#lastKey = key
      }
      return
    }
    this.#range.end = key
  }
}
