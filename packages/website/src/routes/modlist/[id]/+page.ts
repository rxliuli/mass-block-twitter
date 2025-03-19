import { getAuthInfo } from '@/components/auth/auth.svelte.js'
import type { ModListGetResponse } from '@mass-block-twitter/server'

export async function load({ params }) {
  const token = import.meta.env.SSR ? '' : (await getAuthInfo())?.token
  const resp = await fetch(
    `${import.meta.env.VITE_API_URL}/api/modlists/get/${params.id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
  if (!resp.ok) {
    return {
      modList: undefined,
    }
  }
  const modList = (await resp.json()) as ModListGetResponse
  const title = `${modList.name} - Mass Block Twitter`
  const description =
    modList.description ??
    `A Twitter Moderation List created by @${modList.twitterUser.screenName}`
  return {
    modList: modList,
    title,
    description,
    metadata: [
      {
        name: 'title',
        content: title,
      },
      {
        name: 'description',
        content: description,
      },
      // Open Graph / Facebook
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: `https://mass-block-twitter.rxliuli.com/modlist/${modList.id}`,
      },
      {
        property: 'og:title',
        content: title,
      },
      {
        property: 'og:description',
        content: description,
      },
      {
        property: 'og:image',
        content: 'https://mass-block-twitter.rxliuli.com/logo.png',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary',
      },
      {
        name: 'twitter:site',
        content: '@rxliuli',
      },
      {
        name: 'twitter:creator',
        content: '@' + modList.twitterUser.screenName,
      },
      {
        name: 'twitter:title',
        content: title,
      },
      {
        name: 'twitter:description',
        content: description,
      },
      {
        name: 'twitter:image',
        content: 'https://mass-block-twitter.rxliuli.com/logo.png',
      },
      // Additional metadata
      {
        name: 'keywords',
        content: `twitter, moderation list, ${modList.name}, ${modList.twitterUser.screenName}`,
      },
    ],
  }
}
