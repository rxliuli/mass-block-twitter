import { Parser } from '@json2csv/plainjs'
import { parse } from 'csv-parse/browser/esm/sync'

export function generateCSV<T>(
  data: T[],
  options: {
    fields: (keyof T & string)[]
  },
) {
  const parser = new Parser({
    fields: options.fields,
  })
  return parser.parse(data)
}

export function parseCSV<T>(
  csv: string,
  options: { fields: (keyof T & string)[] },
) {
  const data = parse(csv, {
    columns: options.fields,
    skip_empty_lines: true,
  })
  return data.slice(1)
}
