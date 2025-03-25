import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineCustomEventMessage } from '../CustomEventMessage'

describe('CustomEventMessage', () => {
  const createMessager = () =>
    defineCustomEventMessage<{
      hello: (data: string) => string
    }>()
  let sendMessage: ReturnType<typeof createMessager>['sendMessage']
  let onMessage: ReturnType<typeof createMessager>['onMessage']
  let removeMessage: ReturnType<typeof createMessager>['removeMessage']
  let removeAllListeners: ReturnType<
    typeof createMessager
  >['removeAllListeners']
  beforeEach(() => {
    const _ = createMessager()
    sendMessage = _.sendMessage
    onMessage = _.onMessage
    removeMessage = _.removeMessage
    removeAllListeners = _.removeAllListeners
  })
  afterEach(() => {
    removeAllListeners()
  })

  it('should send message', async () => {
    const msg = 'test'
    const f = vi.fn().mockImplementation((msg) => `hello ${msg}`)
    onMessage('hello', f)
    expect(await sendMessage('hello', msg)).toEqual(`hello ${msg}`)
    expect(f).toHaveBeenCalledWith(msg)
  })
  it('should send message with error', async () => {
    const msg = 'test'
    const f = vi.fn().mockImplementation(() => {
      throw new Error('test')
    })
    onMessage('hello', f)
    await expect(sendMessage('hello', msg)).rejects.toThrowError('test')
    expect(f).toHaveBeenCalledWith(msg)
  })
  it('should remove listeners', async () => {
    onMessage('hello', vi.fn())
    removeMessage('hello')
    await expect(sendMessage('hello', 'test')).rejects.toThrowError()
  })
  it('should async callback', async () => {
    onMessage(
      'hello',
      vi.fn().mockImplementation(() => Promise.resolve('test')),
    )
    expect(await sendMessage('hello', 'test')).toEqual('test')
  })
})
