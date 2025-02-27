import { computed, reactive, ref } from '$lib/utils/rune.svelte'
import { describe, expect, it } from 'vitest'

describe('computed', () => {
  it('object', () => {
    let a = $state(1)
    let b = $state(2)
    const c = computed(() => ({ value: a + b }))
    expect(c.value).toBe(3)
    a = 3
    expect(c.value).toBe(5)
  })
  it('primitive', () => {
    let a = $state(1)
    const c = computed(() => ({ value: a }))
    expect(c.value).toBe(1)
    a = 3
    expect(c.value).toBe(3)
  })
  it('snapshot', () => {
    let a = $state(1)
    const c = computed(() => ({ value: a }))
    expect($state.snapshot(c)).toEqual({ value: 1 })
    a = 3
    expect($state.snapshot(c)).toEqual({ value: 3 })
  })
})

describe('reactive', () => {
  it('ref', () => {
    function useCounter() {
      const counter = ref(0)
      return {
        counter,
        increment() {
          counter.value++
        },
        decrement() {
          counter.value--
        },
      }
    }
    const { counter, increment, decrement } = useCounter()
    expect(counter.value).toBe(0)
    increment()
    expect(counter.value).toBe(1)
    decrement()
    expect(counter.value).toBe(0)
  })
  it('reactive', () => {
    const c1 = reactive({ value: 0 })
    expect(c1.value).toBe(0)
    c1.value = 1
    expect(c1.value).toBe(1)
    function useCounter() {
      return reactive({ count: 0 })
    }
    const c2 = useCounter()
    expect(c2.count).toBe(0)
    c2.count = 1
    expect(c2.count).toBe(1)
  })
  it('snapshot', () => {
    const counter = reactive({ value: 0 })
    expect($state.snapshot(counter)).toEqual({ value: 0 })
    counter.value = 1
    expect($state.snapshot(counter)).toEqual({ value: 1 })
  })
  it('undefined', () => {
    const c = $state<{ name: string; list: string[] }>({ name: '', list: [] })
    function val() {
      const state = $derived({
        value: c.list.find((it) => it === c.name),
      })
      return {
        get value() {
          return state.value
        },
      }
    }
    const v = val()
    expect(v.value).undefined
    c.name = 'a'
    c.list.push('a')
    expect(v.value).toBe('a')
  })
})
