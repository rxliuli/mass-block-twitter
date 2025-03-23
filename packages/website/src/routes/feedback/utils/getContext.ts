import type { FeedbackRequest } from '@mass-block-twitter/server'

export function getContext(): FeedbackRequest['context'] {
  const userAgent = navigator.userAgent.toLowerCase()
  let os: FeedbackRequest['context']['os'] = 'other'
  if (userAgent.includes('windows')) os = 'windows'
  else if (userAgent.includes('mac')) os = 'macos'
  else if (userAgent.includes('linux')) os = 'linux'
  else if (userAgent.includes('iphone') || userAgent.includes('ipad'))
    os = 'ios'
  else if (userAgent.includes('android')) os = 'android'

  let browser: FeedbackRequest['context']['browser'] = 'other'
  if (userAgent.includes('edg/') || userAgent.includes('edge')) browser = 'edge'
  else if (userAgent.includes('firefox')) browser = 'firefox'
  else if (userAgent.includes('chrome') && !userAgent.includes('edg'))
    browser = 'chrome'
  else if (userAgent.includes('safari') && !userAgent.includes('chrome'))
    browser = 'safari'

  let deviceType: 'mobile' | 'desktop' = 'desktop'
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) ||
    (window.innerWidth <= 800 && window.innerHeight <= 900)
  ) {
    deviceType = 'mobile'
  }

  const screensize = {
    width: window.screen.width,
    height: window.screen.height,
  }

  const language = navigator.language

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const numberOfCPUs = navigator.hardwareConcurrency || 1

  return {
    os,
    browser,
    deviceType,
    screensize,
    language,
    timezone,
    numberOfCPUs,
  }
}
