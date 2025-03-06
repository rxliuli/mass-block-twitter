import { describe, expect, it } from 'vitest'
import html from './assets/README.md?html'
import { parseMarkdown, renderMarkdown } from '..'

describe('index', () => {
  it('should be a function', async () => {
    // console.log(html)
  })
})

describe('markdown', () => {
  it('should be a function', async () => {
    const html = await renderMarkdown(parseMarkdown('# Hello'))
    expect(html).toBe('<h1>Hello</h1>')
  })
  it('should be a code block', async () => {
    const html = await renderMarkdown(
      parseMarkdown('```ts\nconsole.log("Hello")\n```'),
    )
    expect(html).includes('shiki')
  })
})
