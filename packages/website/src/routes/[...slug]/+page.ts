import { matchDoc } from '@/docs/matchDoc'
import { error } from '@sveltejs/kit'

export async function load({ params }) {
  try {
    if (!params.slug.startsWith('docs')) {
      error(404, `Could not find ${params.slug}`)
    }
    const doc = matchDoc(import.meta.env.DOCS, params.slug.slice(5))
    const post = await import(/* @vite-ignore */ `../../docs/${doc}?html`)
    const meta = await import(/* @vite-ignore */ `../../docs/${doc}?meta`)

    return {
      html: post.default,
      meta: meta.default,
    }
  } catch (e) {
    error(404, `Could not find ${params.slug}`)
  }
}
