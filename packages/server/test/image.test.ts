import { assert, describe, expect, it } from 'vitest'
import { initCloudflareTest } from './utils'

const c = initCloudflareTest()

describe('image', () => {
  it('should be able to upload image', async () => {
    const image = await c.env.MY_BUCKET.put('test.png', new Blob(['test']))
    assert(image)

    const resp = await fetch('/api/image/get/test.png')
    expect(resp.ok).true
    const blob = await resp.blob()
    expect(blob.size).gt(0)
  })
})
