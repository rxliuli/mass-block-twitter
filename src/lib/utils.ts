export function extractObjects(json: any, matcher: (obj: any) => boolean) {
  let results: any[] = []

  function traverse(obj: any) {
    if (matcher(obj)) {
      results.push(obj)
      return
    }
    for (let key in obj) {
      if (typeof obj[key] === 'object') {
        traverse(obj[key])
      }
    }
  }

  traverse(json)
  return results
}

export function parseHeadersText(text: string) {
  return text.split('\r\n').filter((header) => header).reduce((acc, current) => {
    const [key, value] = current.split(': ')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)
}

