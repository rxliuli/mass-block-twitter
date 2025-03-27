import { generateCSV } from '$lib/util/csv'
import { CommunityInfo, CommunityMember } from '$lib/api/twitter'
import { toast } from 'svelte-sonner'
import saveAs from 'file-saver'
import { tP } from '$lib/i18n'

const MAX_REQUESTS = 850
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
  const getUsers = () => query.data
  const toastId = toast.info(
    tP('floatingButton.community.exportMembers.toast.title'),
    {
      description: tP(
        'floatingButton.community.exportMembers.toast.description',
        {
          values: {
            current: getUsers().length,
            total: info.member_count,
          },
        },
      ),
      duration: 1000000,
      cancel: {
        label: tP('floatingButton.community.exportMembers.toast.stop'),
        onClick: () => {
          controller.abort()
        },
      },
    },
  )
  let i = 0
  try {
    while (query.hasNextPage && !controller.signal.aborted) {
      await query.fetchNextPage()
      toast.info(tP('floatingButton.community.exportMembers.toast.title'), {
        id: toastId,
        duration: 1000000,
        // TODO calculate the time
        description: tP(
          'floatingButton.community.exportMembers.toast.description',
          {
            values: {
              current: getUsers().length,
              total: info.member_count,
            },
          },
        ),
      })
      i++
      if (i === MAX_REQUESTS) {
        const r = await new Promise<'stop' | 'continue'>((resolve) => {
          toast.info(
            tP('floatingButton.community.exportMembers.toast.stop.confirm', {
              values: {
                count: MAX_REQUESTS,
              },
            }),
            {
              id: toastId,
              duration: 1000000,
              cancel: {
                label: tP('floatingButton.community.exportMembers.toast.stop'),
                onClick: () => {
                  controller.abort()
                  resolve('stop')
                },
              },
              action: {
                label: tP(
                  'floatingButton.community.exportMembers.toast.continue',
                ),
                onClick: () => {
                  resolve('continue')
                },
              },
            },
          )
        })
        if (r === 'stop') {
          break
        }
      }
      // await wait(1000)
    }
    toast.success(tP('floatingButton.community.exportMembers.toast.success'), {
      duration: 1000000,
      description: tP(
        'floatingButton.community.exportMembers.toast.success.description',
        {
          values: {
            count: getUsers().length,
          },
        },
      ),
      cancel: undefined,
      action: {
        label: tP('floatingButton.community.exportMembers.toast.download'),
        onClick: () => {
          const users = getUsers()
          const csv = generateCSV(users, {
            fields: [
              'id',
              'screen_name',
              'name',
              'description',
              'profile_image_url',
            ],
          })
          saveAs(
            new Blob([csv]),
            `community_${communityId}_${new Date().toISOString()}.csv`,
          )
          toast.dismiss(toastId)
        },
      },
    })
  } catch (err) {
    console.error('exportCommunityMembersToCSV error', err)
    toast.error(tP('floatingButton.community.exportMembers.toast.failed'), {
      duration: 1000000,
      description: tP(
        'floatingButton.community.exportMembers.toast.failed.description',
        {
          values: {
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        },
      ),
      cancel: undefined,
    })
  } finally {
    toast.dismiss(toastId)
  }
}
