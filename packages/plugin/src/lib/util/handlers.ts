import { confirmToast } from '$lib/components/custom/toast'
import { tP } from '$lib/i18n'
import ms from 'ms'
import { toast } from 'svelte-sonner'
import { MiddlewareHandler } from './middleware'
import { QueryOperationContext } from './batch'

interface QueryOperationContextWithToastId {
  context: QueryOperationContext<any>
  toastId: string | number
}

export function errorHandler<
  T extends QueryOperationContextWithToastId,
>(options: { title: string }): MiddlewareHandler<T> {
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

export function sleepHandler<
  T extends {
    context: {
      controller: AbortController
      items: any[]
      progress: {
        total?: number
      }
    }
  },
>(options: { time: number | (() => number) }): MiddlewareHandler<T> {
  return async ({ context }, next) => {
    if (context.items.length === context.progress.total) {
      await next()
      return
    }
    const r = await new Promise<'next' | 'abort'>((resolve) => {
      const waitTime =
        typeof options.time === 'number' ? options.time : options.time()
      const abortListener = () => {
        clearTimeout(timer)
        resolve('abort')
      }
      const timer = setTimeout(() => {
        resolve('next')
        context.controller.signal.removeEventListener('abort', abortListener)
      }, waitTime)
      context.controller.signal.addEventListener('abort', abortListener)
    })
    if (r === 'abort') {
      return
    }
    await next()
  }
}

export function loadingHandler<
  T extends QueryOperationContextWithToastId,
>(options: { title: string }): MiddlewareHandler<T> {
  return async ({ context, toastId }, next) => {
    toast.loading(options.title, {
      id: toastId,
      duration: 1000000,
      description: `Please wait ${
        context.progress.remainingTime
          ? ms(context.progress.remainingTime)
          : 'a moment'
      }, Progress: ${context.progress.successful}/${context.progress.total}`,
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

export function maxRequestsHandler<
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
