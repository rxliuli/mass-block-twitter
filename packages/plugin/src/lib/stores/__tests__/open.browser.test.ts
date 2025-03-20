import { describe, expect, it } from 'vitest'
import { useOpen } from '../open.svelte'

describe('open', () => {
  it('should be open', () => {
    const openState = useOpen()
    expect(openState.open).false
    expect(openState.opened).false
    openState.openModal()
    expect(openState.open).true
    expect(openState.opened).true
    openState.closeModal()
    expect(openState.open).false
    expect(openState.opened).true
  })
  it('should be open with initial', () => {
    const openState = useOpen(true)
    expect(openState.open).true
    expect(openState.opened).true
  })
})
