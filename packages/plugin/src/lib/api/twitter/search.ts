import { getRequestHeaders } from '$lib/api'
import { extractCurrentUserId } from '$lib/observe'

// https://x.com/i/api/1.1/strato/column/User/<userId>/search/searchSafetyReadonly
export async function getSearchSafety(): Promise<{
  optInBlocking: boolean
  optInFiltering: boolean
}> {
  const userId = extractCurrentUserId()
  if (!userId) {
    throw new Error('User ID not found')
  }
  const url = new URL(
    `https://x.com/i/api/1.1/strato/column/User/${userId}/search/searchSafetyReadonly`,
  )
  const resp = await fetch(url, {
    headers: getRequestHeaders(),
  })
  if (!resp.ok) {
    throw resp
  }
  const data = await resp.json()
  return data
}

export async function setSearchSafety(options: {
  optInBlocking: boolean
  optInFiltering: boolean
}) {
  const userId = extractCurrentUserId()
  if (!userId) {
    throw new Error('User ID not found')
  }
  const url = new URL(
    `https://x.com/i/api/1.1/strato/column/User/${userId}/search/searchSafety`,
  )
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...getRequestHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  })
  if (!resp.ok) {
    throw resp
  }
}
