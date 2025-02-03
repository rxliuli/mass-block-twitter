export function getVirtualizedRange(options: {
  itemHeight: number
  count: number
  viewportHeight: number
  top: number
}): {
  start: number
  end: number
  paddingTop: number
  paddingBottom: number
} {
  const { itemHeight, count, viewportHeight, top } = options

  // 计算可见区域能容纳多少行（向上取整）
  const visibleRowCount = Math.ceil(viewportHeight / itemHeight)

  // 计算缓冲行数（取可见行数的一半）
  const bufferRows = Math.ceil(visibleRowCount / 2)

  // 计算起始索引（包含缓冲）
  const startIdx = Math.max(0, Math.floor(top / itemHeight) - bufferRows)

  // 计算结束索引（包含缓冲）
  const endIdx = Math.min(
    count, // 不能超过总行数
    startIdx + visibleRowCount + bufferRows * 2, // 可见行 + 上下缓冲
  )

  // 计算填充高度
  const paddingTop = startIdx * itemHeight
  const paddingBottom = (count - endIdx) * itemHeight

  return {
    start: startIdx,
    end: endIdx,
    paddingTop,
    paddingBottom,
  }
}
