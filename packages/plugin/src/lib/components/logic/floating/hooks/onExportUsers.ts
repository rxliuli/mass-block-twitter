import { confirmToast } from '$lib/components/custom/toast'
import { dbApi, User } from '$lib/db'
import { tP } from '$lib/i18n'
import { QueryOperationContext } from '$lib/util/batch'
import { middleware, MiddlewareHandler } from '$lib/util/middleware'
import ms from 'ms'
import { toast } from 'svelte-sonner'

interface QueryOperationContextWithToastId {
  context: QueryOperationContext<any>
  toastId: string | number
  name: string
}

function errorHandler<T extends QueryOperationContextWithToastId>(options: {
  title: string
}): MiddlewareHandler<T> {
  return async ({ context }, next) => {
    if (context.error) {
      if (context.error instanceof Response) {
        if (context.error.status === 429) {
          toast.error(options.title, {
            duration: 1000000,
            description:
              'Rate limit exceeded, please wait a few minutes before retrying',
          })
          context.controller.abort()
          return
        }
      }
      toast.error(options.title, {
        duration: 1000000,
        description:
          context.error instanceof Error
            ? context.error.message
            : 'Unknown error',
      })
      context.controller.abort()
      return
    }
    await next()
  }
}

function sleepHandler<T extends QueryOperationContextWithToastId>(options: {
  time: number | (() => number)
}): MiddlewareHandler<T> {
  return async ({ context }, next) => {
    if (context.items.length === context.progress.total) {
      await next()
      return
    }
    await new Promise<void>((resolve) => {
      const waitTime =
        typeof options.time === 'number' ? options.time : options.time()
      const abortListener = () => {
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(() => {
        abortListener()
        context.controller.signal.removeEventListener('abort', abortListener)
      }, waitTime)
      context.controller.signal.addEventListener('abort', abortListener)
    })
    await next()
  }
}

function loadingHandler<T extends QueryOperationContextWithToastId>(options: {
  title: string
}): MiddlewareHandler<T> {
  return async ({ context, toastId }, next) => {
    toast.loading(options.title, {
      id: toastId,
      duration: 1000000,
      description: `Please wait ${
        context.progress.remainingTime
          ? ms(context.progress.remainingTime)
          : 'a moment'
      }, Progress: ${context.items.length}/${context.progress.total}`,
      cancel: {
        label: tP('common.actions.stop'),
        onClick: () => {
          context.controller.abort()
        },
      },
    })
    await next()
  }
}

function maxRequestsHandler<
  T extends QueryOperationContextWithToastId,
>(options: { title: string; maxRequests: number }): MiddlewareHandler<T> {
  return async ({ context, toastId }, next) => {
    if (context.index + 1 === options.maxRequests) {
      const r = await confirmToast(options.title, {
        id: toastId,
        description: `You have fetched ${options.maxRequests} requests, do you want to continue?`,
      })
      if (r === 'stop') {
        context.controller.abort()
        return
      }
    }
    await next()
  }
}

export async function onExportUsersProcessed(options: {
  context: QueryOperationContext<User>
  toastId: string | number
  name: string
}) {
  await middleware(options)
    .use(errorHandler({ title: 'Export failed' }))
    .use(
      maxRequestsHandler({
        title: `Exporting ${options.name}...`,
        maxRequests: 450,
      }),
    )
    .use(loadingHandler({ title: 'Exporting followers...' }))
    .use(sleepHandler({ time: () => 1000 + Math.random() * 1000 * 2 }))
    .run()
}

export function extractScreenName(href: string) {
  const match = /^\/(.*?)\/(verified_followers|followers|following)/.exec(
    new URL(href).pathname,
  )
  if (!match) {
    return
  }
  return match[1]
}

export async function getUser(href: string) {
  const userScreenName = extractScreenName(href)
  if (!userScreenName) {
    return
  }
  return await dbApi.users.getByScreenName(userScreenName)
}
