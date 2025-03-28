import { dbApi, User } from '$lib/db'
import { toast } from 'svelte-sonner'
import { confirmToast } from '$lib/components/custom/toast'
import { tP } from '$lib/i18n'
import { serializeError } from 'serialize-error'
import { ExecuteOperationContext, QueryOperationContext } from '$lib/util/batch'
import { middleware } from '$lib/util/middleware'
import ms from 'ms'

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

const MAX_REQUESTS = 850
export async function onExportBlockedUsersProcessed(
  context: QueryOperationContext<User>,
  toastId: string | number,
) {
  await middleware({
    ...context,
    toastId,
  })
    .use(async (context, next) => {
      if (context.error) {
        toast.error('Export failed, please try again later')
        context.controller.abort()
        return
      }
      await next()
    })
    .use(async (context, next) => {
      if (context.progress.processed >= MAX_REQUESTS) {
        const r = await confirmToast(
          `You have reached the maximum number of requests, do you want to continue?`,
          { id: toastId },
        )
        if (r === 'stop') {
          context.controller.abort()
          return
        }
      }
      await next()
    })
    .use(async (context, next) => {
      toast.loading(`Exporting...`, {
        id: toastId,
        description: `Exporting ${context.items.length} blocked users`,
        duration: 1000000,
        cancel: {
          label: 'Stop',
          onClick: () => {
            context.controller.abort()
          },
        },
      })
      await next()
    })
    .run()
}
