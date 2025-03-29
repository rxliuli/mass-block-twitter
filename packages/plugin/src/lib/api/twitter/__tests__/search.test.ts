import { parseSearchPeople } from '../search'
import { extractObjects } from '$lib/util/extractObjects'
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import SearchTimelinePeople from './assets/SearchTimelinePeople.json'
import SearchTimelinePeople2 from './assets/SearchTimelinePeople2.json'

describe('parseSearchPeople', () => {
  function extractCursor(json: any) {
    const schema = z.object({
      entryType: z.literal('TimelineTimelineCursor'),
      value: z.string(),
      cursorType: z.literal('Bottom'),
    })
    return (
      extractObjects(json, (it) => schema.safeParse(it).success) as z.infer<
        typeof schema
      >[]
    )[0].value
  }

  it('parseSearchPeople p1', async () => {
    const r = parseSearchPeople(SearchTimelinePeople)
    expect(r.data).length(20)
    const cursor = extractCursor(SearchTimelinePeople)
    expect(r.cursor).eq(cursor)
  })
  it('parseSearchPeople p2', async () => {
    const r = parseSearchPeople(SearchTimelinePeople2)
    expect(r.data).length(20)
    const cursor = extractCursor(SearchTimelinePeople2)
    expect(r.cursor).eq(cursor)
  })
})
