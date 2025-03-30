import { uniq } from 'es-toolkit'

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
  getKeys() {
    return this.#keys
  }
  setKeys(keys: string[]) {
    const allSelected =
      this.#keys.length !== 0 && this.#keys.length === this.selected.length
    this.#keys = keys
    if (this.#range) {
      if (!keys.includes(this.#range.start)) {
        this.shiftUp()
      }
    }
    if (allSelected) {
      this.#selected = keys
    } else {
      this.#selected = this.#keys.filter((it) => this.#selected.includes(it))
    }
  }
  setSelected(selected: string[]) {
    if (JSON.stringify(this.selected) === JSON.stringify(selected)) {
      return
    }
    this.#selected = selected
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
    if (!this.#keys.includes(key)) {
      return
    }
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
  selectAll() {
    this.shiftUp()
    this.#selected =
      this.#selected.length === this.#keys.length ? [] : this.#keys
  }
}
