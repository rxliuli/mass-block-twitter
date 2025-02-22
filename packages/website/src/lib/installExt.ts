function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return 'Chrome'
  } else if (userAgent.includes('firefox')) {
    return 'Firefox'
  } else if (userAgent.includes('edg')) {
    return 'Edge'
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'Safari'
  } else {
    return 'Unknown Browser'
  }
}

export function installExt() {
  const browser = detectBrowser()
  if (browser === 'Chrome') {
    window.open(
      'https://chromewebstore.google.com/detail/mass-block-twitter/eaghpebepefbcadjdppjjopoagckdhej',
    )
  } else if (browser === 'Firefox') {
    window.open('https://addons.mozilla.org/firefox/addon/mass-block-twitter/')
  } else if (browser === 'Edge') {
    window.open(
      'https://microsoftedge.microsoft.com/addons/detail/jfmhejlgepjmbgeceljmdeimmdolfadf',
    )
  } else if (browser === 'Safari') {
    alert('Safari is not supported yet')
  } else {
    window.open(
      'https://chromewebstore.google.com/detail/mass-block-twitter/eaghpebepefbcadjdppjjopoagckdhej',
    )
  }
}
