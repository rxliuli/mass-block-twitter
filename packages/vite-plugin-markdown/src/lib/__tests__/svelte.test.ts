import { expect, it } from "vitest";
import { transform } from "../svelte";

it('should transform svelte component', () => {
  const html = '<div>Hello</div>'
  const filePath = 'test.svelte'
  const result = transform(html, filePath)
  console.log('result', result)
  expect(result).toBe('export default `<div>Hello</div>`')
})
