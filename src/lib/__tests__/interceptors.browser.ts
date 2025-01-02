import { beforeEach, describe, expect, it, vi } from 'vitest'
import { interceptFetch, interceptXHR } from '../interceptors'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('interceptFetch', () => {
  it('should intercept fetch', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response())
    const logger = vi.fn()
    const unIntercept = interceptFetch(async (c, next) => {
      logger(c.req.url)
      await next()
    })
    const urls = [
      'https://jsonplaceholder.typicode.com/todos/1',
      new URL('https://jsonplaceholder.typicode.com/todos/1'),
      new Request('https://jsonplaceholder.typicode.com/todos/1'),
    ]
    await Promise.all(urls.map((url) => fetch(url)))
    expect(logger.mock.calls).toEqual([
      ['https://jsonplaceholder.typicode.com/todos/1'],
      ['https://jsonplaceholder.typicode.com/todos/1'],
      ['https://jsonplaceholder.typicode.com/todos/1'],
    ])
    expect(spy).toBeCalledTimes(3)
    unIntercept()
  })
  it('should intercept fetch and modify url', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const unIntercept = interceptFetch(async (c, next) => {
      c.req = new Request('https://jsonplaceholder.typicode.com/todos/2', c.req)
      await next()
    })
    const r = await (
      await fetch('https://jsonplaceholder.typicode.com/todos/1')
    ).json()
    expect((spy.mock.calls[0][0] as Request).url).toBe(
      'https://jsonplaceholder.typicode.com/todos/2',
    )
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('should intercept fetch and modify response', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const unIntercept = interceptFetch(async (c, next) => {
      await next()
      const json = await c.res.json()
      json.id = 2
      c.res = new Response(JSON.stringify(json), c.res)
    })
    const r = await (
      await fetch('https://jsonplaceholder.typicode.com/todos/1')
    ).json()
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('should intercept fetch and mock response', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response())
    const unIntercept = interceptFetch(async (c, _next) => {
      c.res = new Response('test')
    })
    const r = await fetch('https://jsonplaceholder.typicode.com/todos/1')
    expect(await r.text()).toBe('test')
    expect(spy).toBeCalledTimes(0)
    unIntercept()
  })
})

describe('interceptXHR', () => {
  it('should intercept XHR', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const logger = vi.fn()
    const unIntercept = interceptXHR(async (c, next) => {
      logger(c.req.url)
      await next()
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    xhr.send()
    expect(logger.mock.calls[0][0]).toBe(
      'https://jsonplaceholder.typicode.com/todos/1',
    )
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it.only('should intercept XHR and modify url', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR(async (c, next) => {
      c.req = new Request('https://jsonplaceholder.typicode.com/todos/2', c.req)
      await next()
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    const r = await new Promise<{ id: string }>((resolve, reject) => {
      xhr.addEventListener('load', function () {
        resolve(JSON.parse(this.responseText))
      })
      xhr.addEventListener('error', function () {
        reject(this.responseText)
      })
      xhr.send()
    })
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('should intercept XHR and modify response', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR(async (c, next) => {
      await next()
      const json = await c.res.json()
      json.id = 2
      c.res = new Response(JSON.stringify(json), c.res)
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    const r = await new Promise<{ id: string }>((resolve, reject) => {
      xhr.addEventListener('load', function () {
        resolve(JSON.parse(this.responseText))
      })
      xhr.addEventListener('error', function () {
        reject(this.responseText)
      })
      xhr.send()
    })
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('should intercept XHR and mock response', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR(async (c, _next) => {
      c.res = new Response('test')
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    xhr.send()
    const r = await new Promise<string>((resolve, reject) => {
      xhr.addEventListener('load', function () {
        resolve(this.responseText)
      })
      xhr.addEventListener('error', function () {
        reject(this.responseText)
      })
      xhr.send()
    })
    expect(r).toBe('test')
    expect(spy).toBeCalledTimes(0)
    unIntercept()
  })
})
