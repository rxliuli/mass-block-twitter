import { CommunityInfo, CommunityMember } from '$lib/api/twitter'
import { toast } from 'svelte-sonner'
import { tP } from '$lib/i18n'
import { batchQuery, QueryOperationContext } from '$lib/util/batch'
import { middleware } from '$lib/util/middleware'
import { confirmToast } from '$lib/components/custom/toast'
import { downloadUsersToCSV } from '$lib/util/downloadUsersToCSV'
import ms from 'ms'
import { createMutation } from '@tanstack/svelte-query'
import { once } from 'es-toolkit'
import { wait } from '@liuli-util/async'

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
          duration: 1000000,
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
        duration: 1000000,
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
      if (context.progress.processed === MAX_REQUESTS) {
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

export async function exportCommunityMembersToCSV(options: {
  communityId: string
  getCommunityInfo: (options: { communityId: string }) => Promise<CommunityInfo>
  query: {
    hasNextPage: boolean
    fetchNextPage: () => Promise<void>
    data: CommunityMember[]
  }
  controller: AbortController
}) {
  const { communityId, getCommunityInfo, query, controller } = options
  const info = await getCommunityInfo({ communityId })
  const toastId = toast.loading(
    tP('floatingButton.community.exportMembers.toast.title'),
  )
  const getUsers = () => query.data
  try {
    await batchQuery({
      controller,
      getItems: () => getUsers(),
      total: info.member_count,
      fetchNextPage: async () => query.fetchNextPage(),
      hasNext: () => query.hasNextPage,
      onProcessed: (context) =>
        onExportCommunityMembersToCSVProcessed(context, toastId),
    })
    toast.success(tP('floatingButton.community.exportMembers.toast.success'), {
      duration: 1000000,
      description: tP(
        'floatingButton.community.exportMembers.toast.success.description',
        { values: { count: getUsers().length } },
      ),
      action: {
        label: tP('floatingButton.community.exportMembers.toast.download'),
        onClick: () => {
          const users = getUsers()
          downloadUsersToCSV(
            users,
            `community_${communityId}_${new Date().toISOString()}.csv`,
          )
        },
      },
    })
  } finally {
    toast.dismiss(toastId)
  }
}
