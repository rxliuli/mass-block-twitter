import { compile } from 'svelte/compiler'

export function transform(html: string, filePath: string): string {
  const result = compile(html, {
    filename: filePath,
  })
  return result.js.code
}
