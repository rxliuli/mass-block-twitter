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
import { customType } from 'drizzle-orm/sqlite-core'
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
      chunkArgsLength = args.length
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

export const safeJson = <TData>(name: string) =>
  customType<{ data: TData | null; driverData: string | null }>({
    dataType() {
      return 'JSONB'
    },
    toDriver(value: TData | null): string | null {
      if (value === null || value === undefined) {
        return null
      }
      try {
        return JSON.stringify(value)
      } catch (error) {
        console.error('Error stringifying JSON for DB:', error)
        return null
      }
    },
    fromDriver(value: string | null): TData | null {
      if (value === null || value === '') {
        return null
      }
      try {
        return JSON.parse(value) as TData
      } catch (error) {
        console.warn(
          `Failed to parse JSON from DB column "${name}". Value:`,
          value,
          'Error:',
          error,
        )
        return null
      }
    },
  })(name)
