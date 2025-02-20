import {
  filterNotifications,
  filterTweets,
  ParsedTweet,
  parseTweets,
  parseUserRecords,
  setRequestHeaders,
} from '$lib/api'
import { dbApi, Tweet, User } from '$lib/db'
import { omit, throttle } from 'lodash-es'
import { Vista, Middleware } from '@rxliuli/vista'
import { wait } from '@liuli-util/async'
import {
  addBlockButton,
  alertWarning,
  extractCurrentUserId,
  extractTweet,
} from '$lib/observe'
import css from './style.css?inline'
import { injectCSS } from '$lib/injectCSS'
import { URLPattern } from 'urlpattern-polyfill'
import {
  getModListSubscribedUsers,
  getSpamUsers,
  refershSpamContext,
} from '$lib/shared'
import {
  blueVerifiedFilter,
  defaultProfileFilter,
  FilterData,
  flowFilter,
  languageFilter,
  modListFilter,
  mutedWordsFilter,
  sharedSpamFilter,
  spamContext,
  TweetFilter,
  verifiedFilter,
} from '$lib/filter'
import { getSettings, Settings } from '$lib/settings'

function blockClientEvent(): Middleware {
  const pattern = new URLPattern(
    'https://x.com/i/api/1.1/jot/client_event.json',
  )
  return async (c, next) => {
    if (pattern.test(c.req.url)) {
      c.res = new Response(
        JSON.stringify({
          success: true,
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
        },
      )
      return
    }
    await next()
  }
}

function loggerRequestHeaders(): Middleware {
  return async (c, next) => {
    if (c.req.headers.get('authorization')) {
      setRequestHeaders(c.req.headers)
    }
    await next()
  }
}

function loggerViewUsers(): Middleware {
  return async (c, next) => {
    await next()
    if (c.res.headers.get('content-type')?.includes('application/json')) {
      const json = await c.res.clone().json()
      const users = parseUserRecords(json)
      if (users.length > 0) {
        // console.log('users', users)
        await dbApi.users.record(users)
      }
    }
  }
}

const reportSpamTweetIds = new Set<string>()

function getFilters(settings: Settings) {
  const filters: TweetFilter[] = [verifiedFilter()]
  if (settings.hideMutedWords) {
    filters.push(mutedWordsFilter())
  }
  if (settings.hideModListAccounts) {
    filters.push(modListFilter())
  }
  if (settings.hideSuspiciousAccounts) {
    filters.push(defaultProfileFilter())
  }
  if (settings.hideSpamAccounts) {
    filters.push(sharedSpamFilter())
  }
  if (settings.hideBlueVerifiedAccounts) {
    filters.push(blueVerifiedFilter())
  }
  if (settings.hideLanguages.length > 0) {
    filters.push(languageFilter(settings.hideLanguages))
  }
  return filters
}

async function firstTimeFilterTweets(json: any) {
  const tweets = parseTweets(json)
  if (tweets.length === 0) {
    return
  }
  await dbApi.tweets.record(
    tweets.map((it) => ({
      ...omit(it, 'user'),
      updated_at: new Date().toISOString(),
      user_id: it.user.id,
    })),
  )
  // console.log('tweets', tweets)
  await refershSpamContext()
  tweets.forEach(async (it) => {
    // Don't block following users
    if (it.user.following) {
      return
    }
    if (spamContext.spamUsers[it.user.id] === 'report') {
      reportSpamTweetIds.add(it.id)
    }
  })
}

function handleNotifications(): Middleware {
  return async (c, next) => {
    await next()
    if (!c.req.url.startsWith('https://x.com/i/api/2/notifications/all.json')) {
      return
    }
    try {
      const json = await c.res.clone().json()
      await firstTimeFilterTweets(json)
      const isShow = flowFilter(getFilters(getSettings()))
      const hideNotifications: [string, FilterData][] = []
      const updatedJson = filterNotifications(json, (it) => {
        const result = isShow(it)
        if (!result.value) {
          hideNotifications.push([result.reason!, it])
        }
        return result.value
      })
      if (hideNotifications.length > 0) {
        console.log('hideNotifications', hideNotifications)
      }
      c.res = new Response(JSON.stringify(updatedJson), c.res)
    } catch (err) {
      console.error('notifications parse error', err)
    }
  }
}

function handleTweets(): Middleware {
  return async (c, next) => {
    await next()
    if (
      !new URLPattern(
        'https://x.com/i/api/graphql/*/(HomeTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|CommunityTweetsTimeline|HomeLatestTimeline|SearchTimeline|Bookmarks|ListLatestTweetsTimeline)',
      ).test(c.req.url)
    ) {
      return
    }
    try {
      const json = await c.res.clone().json()
      await firstTimeFilterTweets(json)
      const isShow = flowFilter(getFilters(getSettings()))
      const hideTweets: [string, ParsedTweet][] = []
      const filteredTweets = filterTweets(json, (it) => {
        const result = isShow({
          type: 'tweet',
          tweet: it,
        })
        if (!result.value) {
          hideTweets.push([result.reason!, it])
        }
        return result.value
      })
      if (hideTweets.length > 0) {
        console.log('hideTweets', hideTweets)
      }
      c.res = new Response(JSON.stringify(filteredTweets), c.res)
    } catch (err) {
      console.error('tweets parse error', err)
    }
  }
}

async function processTweetElement(tweetElement: HTMLElement) {
  if (tweetElement.dataset.spamScanned === 'true') {
    return
  }
  const { tweetId } = extractTweet(tweetElement)
  const tweet = await dbApi.tweets.get(tweetId)
  if (!tweet) {
    console.error(
      'tweet not found',
      tweetId,
      `https://x.com/test/status/${tweetId}`,
    )
    return
  }
  addBlockButton(tweetElement, tweet)
  if (getSettings().hideSpamAccounts && reportSpamTweetIds.has(tweetId)) {
    alertWarning(tweetElement, tweet)
  }
  tweetElement.dataset.spamScanned = 'true'
}

function eachTweetElements() {
  const elements = document.querySelectorAll(
    '[data-testid="cellInnerDiv"]:has([data-testid="reply"]):not([data-spam-scanned="true"])',
  ) as NodeListOf<HTMLElement>
  elements.forEach(processTweetElement)
}

function observe() {
  injectCSS(css)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (
          node.nodeType === 1 &&
          node instanceof HTMLElement &&
          node.getAttribute('data-testid') === 'cellInnerDiv' &&
          node.querySelector('[data-testid="reply"]')
        ) {
          processTweetElement(node)
        }
        throttle(eachTweetElements, 100)
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

export default defineUnlistedScript(async () => {
  new Vista()
    .use(blockClientEvent())
    .use(loggerRequestHeaders())
    .use(loggerViewUsers())
    .use(handleTweets())
    .use(handleNotifications())
    .intercept()
  await wait(() => !!document.body)
  observe()

  document.addEventListener('RefreshModListSubscribedUsers', async () => {
    await refershSpamContext()
    console.log('RefreshModListSubscribedUsers from dashboard', spamContext)
  })
})
