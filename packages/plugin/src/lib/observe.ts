import { dbApi, Tweet } from './db'
import type { TwitterSpamReportRequest } from '@mass-block-twitter/server'
import { eventMessage } from './shared'
import { blockUser, getUserByScreenName } from './api/twitter'
import { ulid } from 'ulidx'

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

export function removeTweets(tweetIds: string[]) {
  const elements = document.querySelectorAll(
    '[data-testid="cellInnerDiv"]:has([data-testid="reply"])',
  ) as NodeListOf<HTMLElement>
  elements.forEach((tweetElement) => {
    const { tweetId } = extractTweet(tweetElement)
    if (tweetIds.includes(tweetId)) {
      // Hide tweets instead of removing them to avoid errors when Twitter itself tries to remove tweets
      tweetElement.style.display = 'none'
    }
  })
}

export function getTweetElement(tweetId: string): HTMLElement | undefined {
  const elements = document.querySelectorAll(
    '[data-testid="cellInnerDiv"]:has([data-testid="reply"])',
  ) as NodeListOf<HTMLElement>
  return [...elements].find((tweetElement) => {
    const { tweetId: tweetElementId } = extractTweet(tweetElement)
    return tweetElementId === tweetId
  })
}

export function addBlockButtonInTweet(tweetElement: HTMLElement, tweet: Tweet) {
  const actionBar = tweetElement.querySelector('[role="group"]')
  if (!actionBar) {
    return
  }
  const customButton = document.createElement('button')
  customButton.style.height = getComputedStyle(actionBar).height
  customButton.className = 'mass-block-twitter-button-block'
  customButton.title = 'Block Spam'
  customButton.style.opacity = '0'
  customButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-ban"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m4.243 5.21 14.39 12.472"/></svg>
    `
  customButton.addEventListener('click', async () => {
    const request = await extractSpamReportRequest(tweet)
    // https://github.com/wxt-dev/wxt/discussions/523#discussioncomment-8666726
    // console.log('spamReport main content script', request)
    eventMessage.sendMessage('SpamReportRequest', request)
    const user = await dbApi.users.get(tweet.user_id)
    if (!user) {
      return
    }
    eventMessage.sendMessage('QuickBlock', {
      user,
      tweet,
    })
  })
  actionBar.appendChild(customButton)
  tweetElement.dataset.spamScanned = 'true'
  requestAnimationFrame(() => {
    customButton.style.opacity = '1'
    customButton.style.transition = 'opacity 0.2s'
  })
}

export function addBlockButtonInUser(
  userElement: HTMLElement,
  screen_name: string,
) {
  if (userElement.dataset.quickBlockAdded === 'true') {
    return
  }
  const followButton = userElement.querySelector(
    'button[data-testid$="-follow"], button[data-testid$="-unfollow"]',
  ) as HTMLElement
  if (!followButton) {
    return
  }
  const blockButton = followButton.cloneNode() as HTMLButtonElement
  blockButton.textContent = 'Block'
  blockButton.style.marginLeft = 'auto'
  blockButton.style.marginRight = '0.5rem'
  const height = getComputedStyle(followButton).height
  blockButton.style.height = height
  blockButton.style.lineHeight = height
  blockButton.style.backgroundColor = 'rgb(244, 33, 46)'
  blockButton.style.color = 'rgb(255, 255, 255)'
  blockButton.style.fontWeight = 'bold'
  const container = followButton.parentElement?.parentElement
  if (!container) {
    return
  }
  container.insertBefore(blockButton, followButton.parentElement)
  userElement.dataset.quickBlockAdded = 'true'
  blockButton.addEventListener('click', async () => {
    const user = await getUserByScreenName(screen_name)
    if (!user) {
      return
    }
    eventMessage.sendMessage('Toast', {
      type: 'success',
      message: `@${user.screen_name} blocked`,
    })
    blockButton.remove()
    await blockUser(user)
    await dbApi.activitys.record([
      {
        id: ulid(),
        action: 'block',
        trigger_type: 'manual',
        match_filter: 'batchSelected',
        match_type: 'user',
        user_id: user.id,
        user_name: user.name,
        user_screen_name: user.screen_name,
        user_profile_image_url: user.profile_image_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  })
}

async function extractSpamReportRequest(
  tweet: Tweet,
): Promise<TwitterSpamReportRequest> {
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
  const getRelationTweet = async (tweetId?: string) => {
    if (tweetId === tweet.id) {
      return null
    }
    if (!tweetId) {
      return null
    }
    const dbTweet = await dbApi.tweets.get(tweetId)
    if (dbTweet) {
      const user = await dbApi.users.get(dbTweet.user_id)
      if (user) {
        return { tweet: dbTweet, user }
      }
    }
    return null
  }
  const relationTweets = (
    await Promise.all([
      getRelationTweet(tweet.conversation_id_str),
      getRelationTweet(tweet.in_reply_to_status_id_str),
      getRelationTweet(tweet.quoted_status_id_str),
    ])
  ).filter(
    (it) => it !== null,
  ) satisfies TwitterSpamReportRequest['context']['relationTweets']
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
        lang: tweet.lang,
        media: tweet.media,
        conversation_id_str: tweet.conversation_id_str,
        in_reply_to_status_id_str: tweet.in_reply_to_status_id_str,
        quoted_status_id_str: tweet.quoted_status_id_str,
      },
      relationTweets: relationTweets,
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
