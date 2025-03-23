import {
  AnyTable,
  TableConfig,
  InferSelectModel,
  getTableName,
  getTableColumns,
  sql,
  SQL,
  InferInsertModel,
} from 'drizzle-orm'
import { uniq, last } from 'es-toolkit'

export function getTableAliasedColumns<T extends AnyTable<TableConfig>>(
  table: T,
) {
  type DataType = InferSelectModel<T>
  const tableName = getTableName(table)
  const columns = getTableColumns(table)
  return Object.entries(columns).reduce(
    (acc, [columnName, column]) => {
      ;(acc as any)[columnName] = sql`${column}`.as(
        `${tableName}_${columnName}`,
      )
      return acc
    },
    {} as {
      [P in keyof DataType]: SQL.Aliased<DataType[P]>
    },
  )
}

// https://developers.cloudflare.com/d1/platform/limits/#:~:text=Maximum%20number%20of%20columns%20per%20table
const D1_MAX_SQL_VARIABLES = 100
export function safeChunkInsertValues<T extends AnyTable<TableConfig>>(
  table: T,
  values: InferInsertModel<T>[],
) {
  const columns = getTableColumns(table)
  const defaultColumns = Object.entries(columns)
    .filter(([_k, v]) => {
      return v.hasDefault
    })
    .map(([k]) => k)
  let chunkArgsLength = 0
  const chunks: InferInsertModel<T>[][] = []
  for (const it of values) {
    const args = uniq([...Object.keys(it), ...defaultColumns])
    if (chunkArgsLength + args.length >= D1_MAX_SQL_VARIABLES) {
      chunks.push([it])
      chunkArgsLength = 0
      continue
    }
    const lastChunk = last(chunks)
    if (lastChunk) {
      lastChunk.push(it)
    } else {
      chunks.push([it])
    }
    chunkArgsLength += args.length
  }
  return chunks
}
