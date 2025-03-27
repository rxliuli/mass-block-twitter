export function getCommunityId(url: string) {
  // https://x.com/i/communities/1900366536683987325/members
  // https://x.com/i/communities/1900366536683987325
  // https://x.com/i/communities/1900366536683987325/
  const match = new URL(url).pathname.match(
    /^\/i\/communities\/(\d+)(\/members)?\/?$/,
  )
  if (!match) {
    return
  }
  return match[1]
}
