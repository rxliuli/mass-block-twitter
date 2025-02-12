import { computed, reactive, ref } from '$lib/rune.svelte'
import { describe, expect, it } from 'vitest'

describe('useMemo', () => {
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

describe('useState', () => {
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
})
