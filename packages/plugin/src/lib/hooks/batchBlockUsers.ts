import {
  batchBlockUsers,
  BatchBlockUsersProcessedMeta,
  ExpectedError,
} from '$lib/api'
import { dbApi, User } from '$lib/db'
import { tP } from '$lib/i18n'
import ms from 'ms'
import { toast } from 'svelte-sonner'
import { ulid } from 'ulidx'
import { AuthInfo } from '@mass-block-twitter/server'
import { fileSelector } from '$lib/util/fileSelector'
import { parse } from 'csv-parse/browser/esm/sync'
import { getSettings } from '$lib/settings'

export async function selectImportFile() {
  const files = await fileSelector({
    accept: '.json, .csv',
  })
  if (!files) {
    return
  }
  const str = await files[0].text()
  let users: User[]
  if (files[0].name.endsWith('.json')) {
    users = JSON.parse(str) as User[]
  } else {
    try {
      users = (
        parse(str, {
          columns: [
            'id',
            'screen_name',
            'name',
            'description',
            'profile_image_url',
          ],
        }) as User[]
      ).slice(1)
    } catch (err) {
      toast.error(tP('modlists.detail.users.import.invalid'))
      return
    }
  }
  if (users.length === 0) {
    toast.error(tP('modlists.detail.users.import.empty'))
    return
  }
  for (const it of users) {
    if (!(it.id && it.screen_name && it.name && it.profile_image_url)) {
      toast.error(tP('modlists.detail.users.import.invalid'))
      return
    }
  }
  const confirmed = confirm(
    tP('modlists.detail.users.import.confirm', {
      values: {
        count: users.length,
      },
    }),
  )
  if (!confirmed) {
    return
  }
  return users
}

export const batchBlockUsersMutation = async <T extends User>(options: {
  controller: AbortController
  users: () => T[]
  total?: number
  blockUser: (user: T) => Promise<'skip' | undefined | void>
  getAuthInfo: () => Promise<AuthInfo>
  onProcessed: (user: T, meta: BatchBlockUsersProcessedMeta) => Promise<void>
}) => {
  const { controller, users } = options
  // controller.abort()
  // controller = new AbortController()
  const cancel = {
    label: tP('modlists.detail.toast.blockingStop'),
    onClick: () => {
      controller.abort()
      toast.dismiss(toastId)
    },
  }
  const toastId = toast.loading(tP('modlists.detail.toast.blocking'), {
    cancel,
  })
  // console.log('[batchBlockMutation] startTime ' + new Date().toISOString())
  let errorToastId = ulid()
  try {
    let lastBlockedIndex = 0
    let realBlockedCount = 0
    const MAX_BLOCK_COUNT = 150
    await batchBlockUsers(users, {
      signal: controller.signal,
      blockUser: async (user) => {
        if (user.following || user.blocking) {
          return 'skip'
        }
        const _user = await dbApi.users.get(user.id)
        if (_user && (_user.following || _user.blocking)) {
          return 'skip'
        }
        const r = await options.blockUser(user)
        if (r === 'skip') {
          return 'skip'
        }
        realBlockedCount++
      },
      onProcessed: async (user, meta) => {
        await options.onProcessed(user, meta)
        const allCount = options?.total ?? users().length
        // console.log(
        //   `[batchBlockMutation] onProcesssed ${meta.index} ${user.screen_name} ` +
        //     new Date().toISOString(),
        // )
        toast.loading(
          tP('modlists.detail.toast.blocked', {
            values: {
              name: user.screen_name,
              index: meta.index,
              total: allCount,
            },
          }),
          {
            id: toastId,
            description: tP('modlists.detail.toast.wait', {
              values: {
                time: ms(meta.averageTime * (allCount - meta.index)),
              },
            }),
            cancel,
          },
        )
        if (meta.error) {
          if (meta.error instanceof ExpectedError) {
            if (meta.error.code === 'rateLimit') {
              toast.error(tP('modlists.detail.toast.rateLimitExceeded'))
              controller.abort()
              return
            }
            if (meta.error.code === 'forbidden') {
              toast.error(tP('modlists.detail.toast.forbidden'), {
                duration: 1000000,
                action: {
                  label: tP('modlists.detail.toast.refresh'),
                  onClick: () => {
                    location.reload()
                  },
                },
              })
              controller.abort()
              return
            }
            if (meta.error.code === 'unauthorized') {
              toast.error(tP('modlists.detail.toast.unauthorized'), {
                duration: 1000000,
                action: {
                  label: tP('modlists.detail.toast.refresh'),
                  onClick: () => {
                    location.reload()
                  },
                },
              })
              controller.abort()
              return
            }
            if (meta.error.code === 'notFound') {
              toast.error(
                tP('modlists.detail.toast.userNotFound', {
                  values: {
                    name: user.screen_name,
                  },
                }),
                {
                  id: errorToastId,
                },
              )
              return
            }
          }
          toast.error(
            tP('modlists.detail.toast.userBlockFailed', {
              values: {
                name: user.screen_name,
              },
            }),
          )
          return
        }
        if (meta.result !== 'skip') {
          await dbApi.users.block(user)
          await dbApi.activitys.record([
            {
              id: ulid().toString(),
              action: 'block',
              trigger_type: 'manual',
              match_type: 'user',
              match_filter: 'modList',
              user_id: user.id,
              user_name: user.name,
              user_screen_name: user.screen_name,
              user_profile_image_url: user.profile_image_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
        }
        lastBlockedIndex = meta.index
        // if not pro user and blocked users >= 150, abort
        const authInfo = await options.getAuthInfo()
        if (!authInfo?.isPro && lastBlockedIndex >= MAX_BLOCK_COUNT) {
          controller.abort()
          return
        }
        // the rate limit is 150 users per 30s
        if (realBlockedCount !== 0) {
          const blockSpeed = getSettings().blockSpeed

          // rate limit ref: https://developer.x.com/en/docs/x-api/v1/accounts-and-users/mute-block-report-users/api-reference/post-blocks-create
          // ref: https://devcommunity.x.com/t/what-is-the-rate-limit-on-post-request-and-post-blocks-create/102434/2
          if (blockSpeed) {
            // If the user sets the maximum number of users to block per minute,
            // then calculate the time to block each user
            const waitTime = (60 * 1000) / Math.max(blockSpeed, 1)
            toast.loading(
              tP('modlists.detail.toast.blockSpeed', {
                values: {
                  count: blockSpeed,
                  time: ms(waitTime),
                },
              }),
              {
                id: toastId,
                description: '',
              },
            )
            let now = Date.now()
            await new Promise<void>((resolve) => {
              const interval = setInterval(() => {
                toast.loading(
                  tP('modlists.detail.toast.blockSpeed', {
                    values: {
                      count: blockSpeed,
                      time: ms(Math.max(0, waitTime - (Date.now() - now))),
                    },
                  }),
                  {
                    id: toastId,
                    description: '',
                  },
                )
              }, 1000)
              const abortListener = () => {
                clearInterval(interval)
                clearTimeout(timer)
                resolve()
              }
              const timer = setTimeout(() => {
                abortListener()
                controller.signal.removeEventListener('abort', abortListener)
              }, waitTime)
              controller.signal.addEventListener('abort', abortListener)
            })
          } else if (realBlockedCount === 450) {
            const r = await new Promise<'stop' | 'continue'>((resolve) => {
              toast.info(tP('modlists.detail.toast.approachingLimit'), {
                id: toastId,
                duration: 1000000,
                description: tP('modlists.detail.toast.approachingLimitDesc'),
                cancel: {
                  label: tP('modlists.detail.toast.stop'),
                  onClick: () => {
                    controller.abort()
                    resolve('stop')
                  },
                },
                action: {
                  label: tP('modlists.detail.toast.continue'),
                  onClick: () => {
                    resolve('continue')
                  },
                },
              })
            })
            if (r === 'stop') {
              return
            }
          } else if (realBlockedCount % 150 === 0) {
            const waitTime = 30 * 1000
            toast.loading(
              tP('modlists.detail.toast.rateLimit', {
                values: {
                  time: ms(Math.max(0, waitTime - (Date.now() - Date.now()))),
                },
              }),
              {
                id: toastId,
                description: '',
              },
            )
            let now = Date.now()
            await new Promise<void>((resolve) => {
              const interval = setInterval(() => {
                toast.loading(
                  tP('modlists.detail.toast.rateLimit', {
                    values: {
                      time: ms(Math.max(0, waitTime - (Date.now() - now))),
                    },
                  }),
                  {
                    id: toastId,
                    description: '',
                  },
                )
              }, 1000)
              const abortListener = () => {
                clearInterval(interval)
                clearTimeout(timer)
                resolve()
              }
              const timer = setTimeout(() => {
                abortListener()
                controller.signal.removeEventListener('abort', abortListener)
              }, waitTime)
              controller.signal.addEventListener('abort', abortListener)
            })
          }
        }
        // if (meta.index % 10 === 0) {
        //   await $query.fetchNextPage()
        // }
      },
    })

    const allCount = options?.total ?? users().length
    const authInfo = await options.getAuthInfo()
    if (!authInfo?.isPro && lastBlockedIndex >= MAX_BLOCK_COUNT) {
      toast.info(tP('modlists.detail.toast.maxBlockedUsers'), {
        description: tP('modlists.detail.toast.maxBlockedUsersDesc', {
          values: {
            current: lastBlockedIndex,
            total: allCount,
          },
        }),
        action: {
          label: tP('modlists.detail.toast.upgradeNow'),
          onClick: () => {
            window.open('https://mass-block-twitter.rxliuli.com/pricing')
          },
        },
      })
    } else {
      toast.success(tP('modlists.detail.toast.blockSuccess'), {
        description: tP('modlists.detail.toast.blockSuccess.description', {
          values: {
            current: lastBlockedIndex,
            total: allCount,
          },
        }),
      })
    }
  } catch (err) {
    console.error('batchBlockUsersMutation error', err)
    toast.error(tP('modlists.detail.toast.blockFailed'))
  } finally {
    toast.dismiss(toastId)
  }
}
