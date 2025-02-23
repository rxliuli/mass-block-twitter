import {
  AnyTable,
  TableConfig,
  InferSelectModel,
  getTableName,
  getTableColumns,
  sql,
  SQL,
} from 'drizzle-orm'

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
