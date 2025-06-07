import { memoize } from 'es-toolkit'

export const fetchAsset = memoize(async (url: string) => {
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`Failed to fetch asset ${url}`)
  }
  return resp.text()
})

export async function extractAllFlags() {
  const text = await fetchAsset('https://x.com/home')
  const regex = /"([^"]+)":\s*{\s*"value"\s*:\s*([^,}]+)\s*}/g
  let match
  const res: Record<string, string | boolean | number> = {}
  while ((match = regex.exec(text)) !== null) {
    const value = match[2] ?? match[3]
    res[match[1]] =
      value === 'true'
        ? true
        : value === 'false'
        ? false
        : value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1)
        : Number(value)
  }
  return res
}

export function extractGQLArgsFromString(text: string) {
  const regex =
    /{queryId:"([^"]+)",operationName:"([^"]+)",operationType:"([^"]+)",metadata:{featureSwitches:\[(.*?)\],fieldToggles:\[(.*?)\]}}/g
  const matches = [...text.matchAll(regex)]

  if (matches.length === 0) {
    throw new Error('Failed to extract GQL args from string')
  }

  return matches.map((match) => ({
    queryId: match[1],
    operationName: match[2],
    operationType: match[3],
    metadata: {
      featureSwitches: match[4]
        ? match[4].split(',').map((s) => s.replace(/"/g, ''))
        : [],
      fieldToggles: match[5]
        ? match[5].split(',').map((s) => s.replace(/"/g, ''))
        : [],
    },
  }))
}

export async function extractMainScript(): Promise<string> {
  const linkEl = document.querySelector(
    'link[href^="https://abs.twimg.com/responsive-web/client-web/main."',
  )
  if (!linkEl || !(linkEl instanceof HTMLLinkElement)) {
    throw new Error(
      'link[href^="https://abs.twimg.com/responsive-web/client-web/main."] is required',
    )
  }
  const text = await fetchAsset(linkEl.href)
  return text
}

async function _extractGQLArgsByName(
  operationName:
    | 'BlockedAccountsAll'
    | 'SearchTimeline'
    | 'Followers'
    | 'Following'
    | 'BlueVerifiedFollowers'
    | 'UserByScreenName',
): Promise<
  | {
      queryId: string
      flags: Record<string, boolean | number | string>
      fieldToggles: Record<string, boolean> | undefined
    }
  | undefined
> {
  const [text, allFlags] = await Promise.all([
    extractMainScript(),
    extractAllFlags(),
  ])
  const args = extractGQLArgsFromString(text)
  const arg = args.find((it) => it.operationName === operationName)
  if (!arg) {
    return undefined
  }
  const flags = arg.metadata.featureSwitches.reduce(
    (c, k) => ({
      ...c,
      [k]: allFlags[k],
    }),
    {} as Record<string, boolean | number | string>,
  )
  if (!flags) {
    return undefined
  }
  let fieldToggles: Record<string, boolean> | undefined = undefined
  if (arg.metadata.fieldToggles.length > 0) {
    fieldToggles = arg.metadata.fieldToggles.reduce(
      (c, k) => ({
        ...c,
        [k]: true,
      }),
      {} as Record<string, boolean>,
    )
  }
  return {
    queryId: arg.queryId,
    flags,
    fieldToggles,
  }
}
export const extractGQLArgsByName = memoize(_extractGQLArgsByName)
