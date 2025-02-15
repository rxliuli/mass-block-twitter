export function getVirtualizedRange(options: {
  itemHeight: number
  count: number
  viewportHeight: number
  top: number
  columns?: number // 添加columns参数
}): {
  start: number
  end: number
  paddingTop: number
  paddingBottom: number
} {
  const { itemHeight, count, viewportHeight, top, columns = 1 } = options

  // 计算每行实际高度
  const rowHeight = itemHeight

  // 计算总行数(向上取整)
  const totalRows = Math.ceil(count / columns)

  // 计算可见区域能容纳多少行
  const visibleRowCount = Math.ceil(viewportHeight / rowHeight)

  // 计算缓冲行数
  const bufferRows = Math.ceil(visibleRowCount / 2)

  // 计算起始行索引
  const startRow = Math.max(0, Math.floor(top / rowHeight) - bufferRows)

  // 计算结束行索引
  const endRow = Math.min(
    totalRows,
    startRow + visibleRowCount + bufferRows * 2,
  )

  // 计算实际item的起始和结束索引
  const start = startRow * columns
  const end = Math.min(count, endRow * columns)

  // 计算padding
  const paddingTop = startRow * rowHeight
  const paddingBottom = (totalRows - endRow) * rowHeight

  return {
    start,
    end,
    paddingTop,
    paddingBottom,
  }
}
