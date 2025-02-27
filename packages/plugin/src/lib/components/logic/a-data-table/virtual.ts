// 虚拟滚动计算函数修改
export function getVirtualizedRange(options: {
  itemHeight: number | ((index: number) => number)
  count: number
  viewportHeight: number
  top: number
  columns?: number
}): {
  start: number
  end: number
  paddingTop: number
  paddingBottom: number
} {
  const { itemHeight, count, viewportHeight, top, columns = 1 } = options

  // 获取指定索引的元素高度
  const getHeight = (index: number) => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
  }

  // 获取指定行的高度
  const getRowHeight = (rowIndex: number) => {
    return getHeight(rowIndex * columns)
  }

  // 计算总行数
  const totalRows = Math.ceil(count / columns)

  // 找到当前滚动位置对应的行
  let currentRow = 0
  let accHeight = 0
  while (currentRow < totalRows && accHeight < top) {
    accHeight += getRowHeight(currentRow)
    currentRow++
  }

  // 计算可见区域能容纳的大概行数(用平均高度估算)
  const averageHeight =
    Array.from({ length: Math.min(10, totalRows) }, (_, i) =>
      getRowHeight(i),
    ).reduce((sum, h) => sum + h, 0) / Math.min(10, totalRows)
  const estimatedVisibleRows = Math.ceil(viewportHeight / averageHeight)

  // 计算缓冲行数
  const bufferRows = Math.ceil(estimatedVisibleRows / 2)

  // 计算起始行和结束行
  const startRow = Math.max(0, currentRow - bufferRows - 1)
  const endRow = Math.min(
    totalRows,
    currentRow + estimatedVisibleRows + bufferRows,
  )

  // 计算实际的起始和结束索引
  const start = startRow * columns
  const end = Math.min(count, endRow * columns)

  // 计算顶部padding(累加实际高度)
  const paddingTop = Array.from({ length: startRow }, (_, i) =>
    getRowHeight(i),
  ).reduce((sum, h) => sum + h, 0)

  // 计算底部padding(累加实际高度)
  const paddingBottom = Array.from({ length: totalRows - endRow }, (_, i) =>
    getRowHeight(i + endRow),
  ).reduce((sum, h) => sum + h, 0)

  return {
    start,
    end,
    paddingTop,
    paddingBottom,
  }
}
