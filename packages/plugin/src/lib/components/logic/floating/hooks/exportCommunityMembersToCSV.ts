import { CommunityInfo, CommunityMember } from '$lib/api/twitter'
import { toast } from 'svelte-sonner'
import { tP } from '$lib/i18n'
import {
  batchQuery,
  BatchQueryOptions,
  QueryOperationContext,
} from '$lib/util/batch'
import { middleware } from '$lib/util/middleware'
import { confirmToast } from '$lib/components/custom/toast'
import { downloadUsersToCSV } from '$lib/util/downloadUsersToCSV'
import ms from 'ms'

const MAX_REQUESTS = 850

export async function onExportCommunityMembersToCSVProcessed(
  context: QueryOperationContext<CommunityMember>,
  toastId: string | number,
) {
  await middleware({
    context,
    toastId,
  })
    .use(async ({ context }, next) => {
      if (context.error) {
        toast.error(tP('floatingButton.community.exportMembers.toast.failed'), {
          duration: Number.POSITIVE_INFINITY,
          description: tP(
            'floatingButton.community.exportMembers.toast.failed.description',
            {
              values: {
                error:
                  context.error instanceof Error
                    ? context.error.message
                    : 'Unknown error',
              },
            },
          ),
        })
        context.controller.abort()
        return
      }
      await next()
    })
    .use(async ({ context, toastId }, next) => {
      toast.loading(tP('floatingButton.community.exportMembers.toast.title'), {
        id: toastId,
        duration: Number.POSITIVE_INFINITY,
        // TODO calculate the time
        description: tP(
          'floatingButton.community.exportMembers.toast.description',
          {
            values: {
              current: context.items.length,
              total: context.progress.total,
              time: ms(context.progress.remainingTime ?? 0),
            },
          },
        ),
        cancel: {
          label: tP('floatingButton.community.exportMembers.toast.stop'),
          onClick: () => {
            context.controller.abort()
          },
        },
      })
      await next()
    })
    .use(async ({ context, toastId }, next) => {
      if (context.index + 1 === MAX_REQUESTS) {
        const r = await confirmToast(
          tP('floatingButton.community.exportMembers.toast.stop.confirm', {
            values: {
              count: MAX_REQUESTS,
            },
          }),
          { id: toastId, description: undefined },
        )
        if (r === 'stop') {
          context.controller.abort()
          return
        }
      }
      await next()
    })
    .run()
}

export async function exportCommunityMembersToCSV(
  options: Pick<
    BatchQueryOptions<CommunityMember>,
    'controller' | 'getItems' | 'fetchNextPage' | 'hasNext'
  > & {
    communityId: string
    getCommunityInfo: (options: {
      communityId: string
    }) => Promise<CommunityInfo>
  },
) {
  const info = await options.getCommunityInfo({
    communityId: options.communityId,
  })
  const toastId = toast.loading(
    tP('floatingButton.community.exportMembers.toast.title'),
  )
  try {
    await batchQuery({
      controller: options.controller,
      getItems: options.getItems,
      fetchNextPage: options.fetchNextPage,
      hasNext: options.hasNext,
      total: info.member_count,
      onProcessed: async (context) => {
        await onExportCommunityMembersToCSVProcessed(context, toastId)
      },
    })
    toast.success(tP('floatingButton.community.exportMembers.toast.success'), {
      duration: Number.POSITIVE_INFINITY,
      description: tP(
        'floatingButton.community.exportMembers.toast.success.description',
        { values: { count: options.getItems().length } },
      ),
      action: {
        label: tP('floatingButton.community.exportMembers.toast.download'),
        onClick: () => {
          downloadUsersToCSV(
            options.getItems(),
            `community_${options.communityId}_${new Date().toISOString()}.csv`,
          )
        },
      },
    })
  } finally {
    toast.dismiss(toastId)
  }
}
