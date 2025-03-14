import {
  blockUser,
  filterNotifications,
  filterTweets,
  initXTransactionId,
  ParsedTweet,
  parseTweets,
  parseUserRecords,
  setRequestHeaders,
} from '$lib/api'
import { Activity, dbApi, User } from '$lib/db'
import { omit, throttle } from 'lodash-es'
import { Vista, Middleware } from '@rxliuli/vista'
import { wait } from '@liuli-util/async'
import { addBlockButton, alertWarning, extractTweet } from '$lib/observe'
import css from './style.css?inline'
import { injectCSS } from '$lib/injectCSS'
import { URLPattern } from 'urlpattern-polyfill'
import { refershSpamContext } from '$lib/shared'
import {
  blueVerifiedFilter,
  defaultProfileFilter,
  FilterData,
  FilterResult,
  flowFilter,
  languageFilter,
  modListFilter,
  mutedWordsFilter,
  sharedSpamFilter,
  spamContext,
  TweetFilter,
  selfFilter,
} from '$lib/filter'
import { getSettings, Settings } from '$lib/settings'
import { ulid } from 'ulidx'

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

function loggerUsers(): Middleware {
  return async (c, next) => {
    await next()
    if (c.res.headers.get('content-type')?.includes('application/json')) {
      const json = await c.res.clone().json()
      const users = parseUserRecords(json)
      if (users.length > 0) {
        // console.log('loggerUsers', c.req.url, json, users)
        await dbApi.users.record(users)
      }
    }
  }
}

const reportSpamTweetIds = new Set<string>()

function getFilters(settings: Settings) {
  const filters: TweetFilter[] = [selfFilter()]
  if (settings.hideModListAccounts) {
    filters.push(modListFilter())
  }
  if (settings.hideMutedWords) {
    filters.push(mutedWordsFilter())
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

function loggerTweets(): Middleware {
  return async (c, next) => {
    await next()
    if (c.res.headers.get('content-type')?.includes('application/json')) {
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
  }
}

const queue: User[] = []
async function onAction(
  filterData: FilterData,
  result: Extract<FilterResult, 'hide' | 'block'>,
  filterName: TweetFilter['name'],
) {
  let user: User
  let activity: Activity = {
    id: ulid().toString(),
    action: result,
    trigger_type: 'auto',
    match_type: filterData.type,
    match_filter: filterName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Activity
  if (filterData.type === 'user') {
    user = filterData.user
    activity = {
      ...activity,
      user_id: user.id,
      user_name: user.name,
      user_screen_name: user.screen_name,
      user_profile_image_url: user.profile_image_url,
    }
  } else {
    user = filterData.tweet.user
    activity = {
      ...activity,
      user_id: user.id,
      user_name: user.name,
      user_screen_name: user.screen_name,
      user_profile_image_url: user.profile_image_url,
      tweet_id: filterData.tweet.id,
      tweet_content: filterData.tweet.text,
    }
  }
  if (queue.some((it) => it.id === user.id)) {
    return
  }
  queue.unshift(user)
  queue.length = 100
  dbApi.activitys.record([activity])
  if (user.blocking || result !== 'block') {
    return
  }
  await blockUser(user)
  console.log('blockUser', user)
  new Notification('Blocked user', {
    body: `${user.name} @${user.screen_name}`,
  }).onclick = () => {
    window.open(`https://x.com/${user.screen_name}`, '_blank')
  }
}
function handleNotifications(): Middleware {
  return async (c, next) => {
    await next()
    if (
      !new URLPattern(
        'https://x.com/i/api/2/notifications/(all|verified).json',
      ).test(c.req.url)
    ) {
      return
    }
    try {
      const json = await c.res.clone().json()
      const isShow = flowFilter(getFilters(getSettings()), onAction)
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
      const isShow = flowFilter(getFilters(getSettings()), onAction)
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

export default defineContentScript({
  matches: ['https://x.com/**'],
  allFrames: true,
  runAt: 'document_start',
  world: 'MAIN',
  async main() {
    initXTransactionId()
    new Vista()
      .use(blockClientEvent())
      .use(loggerRequestHeaders())
      .use(handleNotifications())
      .use(handleTweets())
      .use(loggerTweets())
      .use(loggerUsers())
      .intercept()
    await wait(() => !!document.body)
    observe()

    document.addEventListener('RefreshModListSubscribedUsers', async () => {
      await refershSpamContext()
    })
  },
})
