import { BrowserCommands } from '@vitest/browser/context'
import { type BrowserCommandContext } from 'vitest/node'
import { readFile } from 'fs/promises'

type _CustomCommand<T extends BrowserCommands> = {
  [K in keyof Omit<T, 'readFile' | 'writeFile' | 'removeFile'>]: T[K] extends (
    ...args: infer P
  ) => infer R
    ? (ctx: BrowserCommandContext, ...args: P) => R
    : never
}

export const customCommands: _CustomCommand<BrowserCommands> = {
  waitForDownload: async (ctx) => {
    const download = await ctx.page.waitForEvent('download')
    return {
      suggestedFilename: download.suggestedFilename(),
      text: await readFile(await download.path(), 'utf-8'),
    }
  },
}
