import { describe, expect, it } from 'vitest'
import { matchDoc } from '../matchDoc'

describe('matchDoc', () => {
  it('should return the correct path', () => {
    const docs = ['README.md', 'about.md']
    const slug = 'docs/about'
    const result = matchDoc(docs, slug)
    expect(matchDoc(docs, '')).eq('README.md')
    expect(matchDoc(docs, 'about')).eq('about.md')
  })
})
