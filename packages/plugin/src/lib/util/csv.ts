import { parse, unparse } from 'papaparse'

export function generateCSV<T extends object>(
  data: T[],
  options: {
    fields: (keyof T & string)[]
  },
): string {
  return unparse(data, {
    columns: options.fields,
    header: true,
    newline: '\r\n',
  })
}

export function parseCSV<T extends object>(csv: string): T[] {
  const normalized = csv.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
  const data = parse<T>(normalized, {
    header: true,
    skipEmptyLines: true,
    newline: '\n',
    transform(value) {
      if (value === '') {
        return
      }
      return value
    },
  })
  return data.data.map((it) => {
    if ('avatar_image_url' in it) {
      Reflect.set(it, 'profile_image_url', it['avatar_image_url'])
      delete it['avatar_image_url']
    }
    return it
  })
}
