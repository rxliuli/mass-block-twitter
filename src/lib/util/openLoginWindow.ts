export function openLoginWindow(url: string) {
  // 检查是否是移动设备
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )

  if (isMobile) {
    // 移动设备:打开新标签页
    window.open(url, '_blank')
  } else {
    // 桌面设备:打开弹窗
    const width = 500 // 窗口宽度
    const height = 600 // 窗口高度

    // 计算窗口位置,使其居中
    const left = (window.innerWidth - width) / 2 + window.screenX
    const top = (window.innerHeight - height) / 2 + window.screenY

    // 配置窗口参数
    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
      'resizable=yes',
      'scrollbars=yes',
      'status=yes',
    ].join(',')

    // 打开弹窗
    window.open(url, 'LoginWindow', features)
  }
}
