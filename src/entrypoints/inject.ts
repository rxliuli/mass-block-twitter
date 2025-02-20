import {
  filterTweets,
  ParsedTweet,
  parseTweets,
  parseUserRecords,
  setRequestHeaders,
} from '$lib/api'
import { dbApi, Tweet } from '$lib/db'
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
  flowFilter,
  languageFilter,
  modListFilter,
  mutedWordsFilter,
  sharedSpamFilter,
  spamContext,
  TweetFilter,
  verifiedFilter,
} from '$lib/filter'
import { getSettings } from '$lib/settings'

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

function handleTweets(): Middleware {
  const routes = [
    'https://x.com/i/api/graphql/*/(HomeTimeline|TweetDetail|UserTweets|UserTweetsAndReplies|CommunityTweetsTimeline|HomeLatestTimeline|SearchTimeline|Bookmarks|ListLatestTweetsTimeline)',
    'https://x.com/i/api/2/notifications/all.json',
  ]
  const filters: TweetFilter[] = [verifiedFilter()]
  const settings = getSettings()
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
  return async (c, next) => {
    await next()
    if (routes.some((it) => new URLPattern(it).test(c.req.url))) {
      try {
        const json = await c.res.clone().json()
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
        console.log('tweets', tweets)
        await refershSpamContext()
        tweets.forEach(async (it) => {
          // Don't block following users
          if (it.user.following) {
            return
          }
          if (spamContext.spamUsers[it.user.id]) {
            switch (spamContext.spamUsers[it.user.id]) {
              case 'report':
                reportSpamTweetIds.add(it.id)
                break
            }
          }
        })
        const hideTweets: [string, ParsedTweet][] = []
        const isShow = flowFilter(filters)
        const filteredTweets = filterTweets(json, (it) => {
          const result = isShow(it)
          if (!result) {
            hideTweets.push([it.id, it])
          }
          return result
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
    .intercept()
  await wait(() => !!document.body)
  observe()

  document.addEventListener('RefreshModListSubscribedUsers', async () => {
    await refershSpamContext()
    console.log('RefreshModListSubscribedUsers from dashboard', spamContext)
  })
})
