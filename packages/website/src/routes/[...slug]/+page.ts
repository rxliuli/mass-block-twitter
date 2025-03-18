import { matchDoc } from '@/docs/matchDoc'
import { error } from '@sveltejs/kit'
import type { EntryGenerator } from './$types'

export async function load({ params }) {
  try {
    if (!params.slug.startsWith('docs')) {
      error(404, `Could not find ${params.slug}`)
    }
    const doc = matchDoc(import.meta.env.DOCS, params.slug.slice(5))

    const htmlModules = import.meta.glob('../../docs/**/*.md', {
      query: '?html',
      eager: false,
    })
    const metaModules = import.meta.glob('../../docs/**/*.md', {
      query: '?meta',
      eager: false,
    })

    const mdPath = `../../docs/${doc}`
    if (!htmlModules[mdPath] || !metaModules[mdPath]) {
      error(404, `Could not find ${params.slug}`)
    }

    const [post, meta] = await Promise.all([
      htmlModules[mdPath](),
      metaModules[mdPath](),
    ])

    return {
      html: (post as any).default,
      meta: (meta as any).default,
    }
  } catch (e) {
    error(404, `Could not find ${params.slug}`)
  }
}

export const entries: EntryGenerator = () => {
  return [
    { slug: 'docs/01-installation' },
    { slug: 'docs/02-usage' },
    { slug: 'docs/03-faq' },
    { slug: 'docs/04-changelog' },
    { slug: 'docs/05-contact' },
    { slug: 'docs/terms' },
    { slug: 'docs/privacy' },
    { slug: 'docs/refund' },
  ]
}
