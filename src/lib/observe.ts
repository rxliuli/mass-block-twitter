import { blockUser } from './api'
import { dbApi, Tweet } from './db'
import type { spamReportRequestSchema } from '@mass-block-twitter/server'

export function extractCurrentUserId(): string | undefined {
  return /"id_str":"(\d*)"/.exec(document.body.innerHTML)?.[1]
}

export function extractTweet(tweetElement: HTMLElement): {
  tweetId: string
  tweetText?: string
} {
  const tweetLink = tweetElement.querySelector('a[href*="/status/"]')
  if (!tweetLink || !(tweetLink instanceof HTMLAnchorElement)) {
    console.log('tweetElement', tweetElement.innerHTML)
    throw new Error('tweetLink not found')
  }
  const tweetId = tweetLink.href.match(/status\/(\d+)/)?.[1]
  if (!tweetId) {
    throw new Error('tweetId not found')
  }
  const tweetText = tweetElement.querySelector(
    '[data-testid="tweetText"]',
  )?.textContent
  return {
    tweetId,
    tweetText: tweetText?.trim(),
  }
}

export function addBlockButton(tweetElement: HTMLElement, tweet: Tweet) {
  const actionBar = tweetElement.querySelector('[role="group"]')
  if (actionBar) {
    const customButton = document.createElement('button')
    customButton.className = 'mass-block-twitter-button-block'
    customButton.title = 'Block Spam'
    customButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-ban"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m4.243 5.21 14.39 12.472"/></svg>
    `
    customButton.addEventListener('click', async () => {
      const request = await extractSpamReportRequest(tweet)
      // https://github.com/wxt-dev/wxt/discussions/523#discussioncomment-8666726
      // console.log('spamReport main content script', request)
      globalThis.dispatchEvent(
        new CustomEvent('SpamReportRequest', {
          detail: request,
        }),
      )
      await blockUser({ id: tweet.user_id })
      tweetElement.remove()
    })
    actionBar.appendChild(customButton)
  }
}

async function extractSpamReportRequest(
  tweet: Tweet,
): Promise<typeof spamReportRequestSchema._type> {
  const reportUserId = extractCurrentUserId()
  if (!reportUserId) {
    throw new Error('reportUserId not found')
  }
  const spamUserId = tweet.user_id
  const reportUser = await dbApi.users.get(reportUserId)
  if (!reportUser) {
    throw new Error('reportUser not found ' + reportUserId)
  }
  const spamUser = await dbApi.users.get(spamUserId)
  if (!spamUser) {
    throw new Error('spamUser not found ' + spamUserId)
  }
  return {
    reportUser: reportUser,
    spamUser: spamUser,
    context: {
      page_url: location.href,
      page_type: extractPageType(),
      tweet: {
        text: tweet.text,
        id: tweet.id,
        created_at: tweet.created_at,
        media: tweet.media,
      },
    },
  }
}

function extractPageType(): 'timeline' | 'tweetDetail' | 'other' {
  const pathname = location.pathname
  if (pathname.includes('/home')) {
    return 'timeline'
  }
  if (pathname.includes('/status/')) {
    return 'tweetDetail'
  }
  return 'other'
}

export function alertWarning(tweetElement: HTMLElement, tweet: Tweet) {
  tweetElement.style.backgroundColor = '#ffeb3b40'
}
