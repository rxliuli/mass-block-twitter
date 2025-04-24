import { assert, describe, it } from 'vitest'
import { initCloudflareTest } from './utils'

const c = initCloudflareTest()

// TODO: https://github.com/cloudflare/workers-sdk/issues/5524
describe('should be able to upload avatar', () => {
  it('with string', async () => {
    const bucket = c.env.MY_BUCKET
    const file = await bucket.put('abc', 'def')
    assert(file)

    const read = await bucket.get('abc')
    assert(read)
    const text = await read.text()
    assert(text === 'def')
  })
  it('with datauri', async () => {
    const bucket = c.env.MY_BUCKET
    const file = await bucket.put('abc', 'data:image/jpeg;base64,/test1')
    assert(file)

    const read = await bucket.get('abc')
    assert(read)
    const text = await read.text()
    assert(text === 'data:image/jpeg;base64,/test1')
  })
})
