import {
  filterNotifications,
  filterTweets,
  ParsedTweet,
  parseTweets,
  parseUserRecords,
  setRequestHeaders,
} from '$lib/api'
import { Activity, dbApi, initDB, User } from '$lib/db'
import { omit, throttle } from 'es-toolkit'
import { Vista, Middleware } from '@rxliuli/vista'
import { asyncLimiting, wait } from '@liuli-util/async'
import {
  addBlockButtonInTweet,
  addBlockButtonInUser,
  extractTweet,
} from '$lib/observe'
import css from './style.css?inline'
import { injectCSS } from '$lib/injectCSS'
import { URLPattern } from 'urlpattern-polyfill'
import { refreshSpamUsers, refreshSubscribedModLists } from '$lib/shared'
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
  TweetFilter,
  selfFilter,
  grokFilter,
  adFilter,
} from '$lib/filter'
import { getDefaultSettings, getSettings, Settings } from '$lib/settings'
import { ulid } from 'ulidx'
import { blockUser, getUserByScreenName } from '$lib/api/twitter'

function blockClientEvent(): Middleware {
  return async (c, next) => {
    if (
      [
        'https://x.com/i/api/1.1/jot/client_event.json',
        'https://x.com/i/api/1.1/keyregistry/register',
      ].includes(c.req.url)
    ) {
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
      if (users.length === 0) {
        return
      }
      console.debug('loggerUsers', c.req.url, users)
      await dbApi.users.record(users)
      requestAnimationFrame(async () => {
        if (getSettings().hideSpamAccounts) {
          await dbApi.pendingCheckUsers.record(users.map((it) => it.id))
        }
        await Promise.all([
          refreshSpamUsers(users.map((it) => it.id)),
          // refreshSubscribedModLists(),
        ])
        handleUsers(users)
      })
    }
  }
}

function handleUsers(users: User[]) {
  const isShow = flowFilter(getFilters(getSettings()), onAction)
  for (const user of users) {
    isShow({
      type: 'user',
      user,
    })
  }
}

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
  if (settings.hideGrok) {
    filters.push(grokFilter())
  }
  if (settings.hideAdvertiser ?? getDefaultSettings().hideAdvertiser) {
    filters.push(adFilter())
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
      console.debug('loggerTweets', c.req.url, tweets)
      await dbApi.tweets.record(
        tweets.map((it) => ({
          ...omit(it, ['user']),
          updated_at: new Date().toISOString(),
          user_id: it.user.id,
        })),
      )
    }
  }
}

const queue: User[] = []
async function _onAction(
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
  } else {
    user = filterData.tweet.user
    activity = {
      ...activity,
      tweet_id: filterData.tweet.id,
      tweet_content: filterData.tweet.text,
    }
  }
  activity = {
    ...activity,
    user_id: user.id,
    user_name: user.name,
    user_screen_name: user.screen_name,
    user_profile_image_url: user.profile_image_url,
  }
  if (queue.some((it) => it.id === user.id)) {
    return
  }
  queue.unshift(user)
  queue.length = 100
  if (result !== 'block') {
    return
  }
  const userByScreenName = await getUserByScreenName(user.screen_name)
  console.debug('userByScreenName', userByScreenName)
  if (
    !userByScreenName ||
    userByScreenName.following ||
    userByScreenName.blocking
  ) {
    return
  }
  dbApi.activitys.record([activity])
  await blockUser(user)
  console.debug('blockUser', user, await dbApi.users.isBlocking(user.id))
  await dbApi.users.block(user)
  try {
    new Notification('Blocked user', {
      body: `${user.name} @${user.screen_name}`,
    }).onclick = () => {
      window.open(`https://x.com/${user.screen_name}`, '_blank')
    }
  } catch {}
}
const onAction = asyncLimiting(_onAction, 1)
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
        console.debug('hideTweets', hideTweets)
      }
      c.res = new Response(JSON.stringify(filteredTweets), c.res)
    } catch (err) {
      console.error('tweets parse error', err)
    }
  }
}

function eachTweetElements() {
  const elements = document.querySelectorAll(
    '[data-testid="cellInnerDiv"]:has([data-testid="reply"]):not([data-quick-block-added="true"])',
  ) as NodeListOf<HTMLElement>
  elements.forEach(addBlockButtonInTweet)
}

const eachTweetElementsThrottle = throttle(eachTweetElements, 100)

async function processUserElement(userElement: HTMLElement) {
  const userLink = userElement.querySelector<HTMLAnchorElement>(
    'a[href^="/"][role="link"]',
  )
  const screen_name = userLink?.href.split('/').pop()
  if (!screen_name) {
    return
  }
  addBlockButtonInUser(userElement, screen_name)
}

function eachUserElements() {
  const elements = document.querySelectorAll(
    '[data-testid="cellInnerDiv"]:has([data-testid="UserCell"]):not([data-quick-block-added="true"])',
  ) as NodeListOf<HTMLElement>
  elements.forEach(processUserElement)
}

const eachUserElementsThrottle = throttle(eachUserElements, 100)

function observe() {
  injectCSS(css)
  const observer = new MutationObserver((mutations) => {
    if (
      location.pathname.endsWith('/members') ||
      location.pathname.endsWith('/moderators') ||
      location.pathname.endsWith('/retweets') ||
      location.pathname.endsWith('/verified_followers') ||
      location.pathname.endsWith('/following') ||
      location.pathname.endsWith('/followers')
    ) {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === 1 &&
            node instanceof HTMLElement &&
            node.getAttribute('data-testid') === 'cellInnerDiv' &&
            node.querySelector('[data-testid="UserCell"]') !== null &&
            node.querySelector(
              'button[data-testid$="-follow"], button[data-testid$="-unfollow"]',
            ) !== null
          ) {
            processUserElement(node)
          }
          eachUserElementsThrottle()
        })
      })
      return
    }
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (
          node.nodeType === 1 &&
          node instanceof HTMLElement &&
          node.getAttribute('data-testid') === 'cellInnerDiv' &&
          node.querySelector('[data-testid="reply"]')
        ) {
          addBlockButtonInTweet(node)
        }
        eachTweetElementsThrottle()
      })
    })
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

export default defineContentScript({
  matches: ['https://x.com/**', 'https://mobile.x.com/**'],
  allFrames: true,
  runAt: 'document_start',
  world: 'MAIN',
  async main() {
    await initDB()
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

    await refreshSubscribedModLists()
    document.addEventListener('RefreshModListSubscribedUsers', async () => {
      await refreshSubscribedModLists()
    })
  },
})
