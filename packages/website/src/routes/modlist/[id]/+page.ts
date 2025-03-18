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
  return {
    modList: (await resp.json()) as ModListGetResponse,
  }
}
