/**
 *
 * @param docs
 * @param slug
 * @returns
 * @example
 */
export function matchDoc(docs: string[], slug: string) {
  if (slug === '') {
    return 'README.md'
  }
  return docs.find((it) => {
    return it === `${slug}.md` || it === `${slug}/README.md`
  })
}
