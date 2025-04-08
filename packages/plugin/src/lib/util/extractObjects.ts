export function extract(json: any, matcher: (obj: any) => boolean) {
  let results: {
    value: any
    path: string[]
  }[] = []

  function traverse(obj: any, path: string[]) {
    if (matcher(obj)) {
      results.push({
        value: obj,
        path,
      })
    }
    for (let key in obj) {
      if (typeof obj[key] === 'object') {
        traverse(obj[key], [...path, key])
      }
    }
  }

  traverse(json, [])
  return results
}

export function extractObjects(json: any, matcher: (obj: any) => boolean) {
  return extract(json, matcher).map((it) => it.value)
}
