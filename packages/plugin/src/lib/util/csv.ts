import { stringify } from 'csv-stringify/browser/esm/sync'
import { parse } from 'csv-parse/browser/esm/sync'

export function generateCSV<T>(
  data: T[],
  options: {
    fields: (keyof T & string)[]
  },
) {
  return stringify(data, {
    columns: options.fields,
    header: true,
    quoted_string: true,
    bom: true,
  })
}

export function parseCSV<T>(
  csv: string,
  options: { fields: (keyof T & string)[] },
) {
  const data = parse(csv, {
    columns: options.fields,
    skipEmptyLines: true,
    skipRecordsWithEmptyValues: true,
    fromLine: 2,
    bom: true,
    cast: (value, context) => {
      if (value === '' && !context.quoting) {
        return
      }
      return value
    },
  })
  return data
}
