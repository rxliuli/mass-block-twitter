import { dbApi, User } from '$lib/db'
import { toast } from 'svelte-sonner'
import { confirmToast } from '$lib/components/custom/toast'
import { tP } from '$lib/i18n'
import { serializeError } from 'serialize-error'
import {
  batchQuery,
  BatchQueryOptions,
  ExecuteOperationContext,
  QueryOperationContext,
} from '$lib/util/batch'
import { middleware, MiddlewareHandler } from '$lib/util/middleware'
import ms from 'ms'
import { downloadUsersToCSV } from '$lib/util/downloadUsersToCSV'
import { getAuthInfo } from '$lib/hooks/useAuthInfo.svelte'

export async function onBatchUnblockProcessed(
  context: ExecuteOperationContext<User, void>,
  toastId: string | number,
) {
  await middleware({
    ...context,
    toastId,
  })
    .use(async (context, next) => {
      if (context.error) {
        toast.error(
          tP('blocked-users.toast.unblockingFailed', {
            values: {
              current: context.progress.processed,
              total: context.progress.total,
              name: context.item.name,
            },
          }),
          {
            description: serializeError(context.error).message,
          },
        )
      }
      await next()
    })
    .use(async (context, next) => {
      await dbApi.users.unblock(context.item)
      await next()
    })
    .use(async (context, next) => {
      toast.loading(
        tP('blocked-users.toast.unblockingProgress', {
          values: {
            current: context.progress.processed,
            total: context.progress.total,
            name: context.item.name,
          },
        }),
        {
          id: toastId,
          description: tP('blocked-users.toast.wait', {
            values: {
              time: ms(context.progress.remainingTime ?? 0),
            },
          }),
          cancel: {
            label: 'Stop',
            onClick: () => {
              context.controller.abort()
            },
          },
        },
      )
      await next()
    })
    .run()
}

type Handler = MiddlewareHandler<{
  context: QueryOperationContext<User>
  toastId: string | number
}>

const errorHandler: Handler = async ({ context }, next) => {
  if (context.error) {
    toast.error(tP('blocked-users.toast.export.failed'), {
      description: serializeError(context.error).message,
    })
    context.controller.abort()
    return
  }
  await next()
}
const MAX_REQUESTS = 850
const maxRequestsHandler: Handler = async ({ context, toastId }, next) => {
  if (context.progress.processed === MAX_REQUESTS) {
    const r = await confirmToast(tP('blocked-users.toast.export.maxRequests'), {
      id: toastId,
    })
    if (r === 'stop') {
      context.controller.abort()
      return
    }
  }
  await next()
}
const progressHandler: Handler = async ({ context, toastId }, next) => {
  toast.loading(tP('blocked-users.toast.export.progress.title'), {
    id: toastId,
    description: tP('blocked-users.toast.export.progress.description', {
      values: { count: context.items.length },
    }),
    duration: 1000000,
    cancel: {
      label: tP('common.actions.stop'),
      onClick: () => {
        context.controller.abort()
      },
    },
  })
  await next()
}
const NOT_PRO_LIMIT = 1500
const notProLimitHandler: Handler = async ({ context }, next) => {
  const authInfo = await getAuthInfo()
  if (authInfo?.isPro) {
    await next()
    return
  }
  if (context.items.length >= NOT_PRO_LIMIT) {
    toast.info(
      tP('blocked-users.toast.export.notProLimit', {
        values: { count: NOT_PRO_LIMIT },
      }),
      {
        duration: 1000000,
        action: {
          label: tP('common.actions.upgrade'),
          onClick: () => {
            window.open('https://mass-block-twitter.rxliuli.com/pricing')
          },
        },
      },
    )
    context.controller.abort()
    return
  }
  await next()
}
export async function onExportBlockedUsersProcessed(
  context: QueryOperationContext<User>,
  toastId: string | number,
) {
  await middleware({
    context,
    toastId,
  })
    .use(errorHandler)
    .use(maxRequestsHandler)
    .use(progressHandler)
    // .use(notProLimitHandler)
    .run()
}

export async function batchExportBlockedUsers(
  options: Pick<
    BatchQueryOptions<User>,
    'controller' | 'getItems' | 'fetchNextPage' | 'hasNext'
  >,
) {
  const toastId = toast.loading(tP('blocked-users.toast.export.start'))
  try {
    await batchQuery({
      controller: options.controller,
      getItems: options.getItems,
      hasNext: options.hasNext,
      fetchNextPage: options.fetchNextPage,
      onProcessed: (context) => onExportBlockedUsersProcessed(context, toastId),
    })
    toast.success(tP('blocked-users.toast.export.success'), {
      duration: 1000000,
      description: tP('blocked-users.toast.export.success.description', {
        values: { count: options.getItems().length },
      }),
      cancel: undefined,
      action: {
        label: tP('common.actions.download'),
        onClick: () => {
          const users = options.getItems()
          downloadUsersToCSV(users, 'blocked_users')
        },
      },
    })
  } finally {
    toast.dismiss(toastId)
  }
}
