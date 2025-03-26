import { generateCSV } from '$lib/util/csv'
import { CommunityInfo, CommunityMember } from '$lib/api/twitter'
import { toast } from 'svelte-sonner'
import saveAs from 'file-saver'

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
  const toastId = toast.info('Exporting...', {
    description: `Please wait a moment, ${getUsers().length} / ${
      info.member_count
    }`,
    duration: 1000000,
    cancel: {
      label: 'Stop',
      onClick: () => {
        controller.abort()
      },
    },
  })
  let i = 0
  try {
    while (query.hasNextPage && !controller.signal.aborted) {
      await query.fetchNextPage()
      toast.info('Exporting...', {
        id: toastId,
        duration: 1000000,
        // TODO calculate the time
        description: `Please wait a moment, ${getUsers().length} / ${
          info.member_count
        }`,
      })
      i++
      if (i === MAX_REQUESTS) {
        const r = await new Promise<'stop' | 'continue'>((resolve) => {
          toast.info(
            `You have fetched ${MAX_REQUESTS} requests, do you want to continue?`,
            {
              id: toastId,
              duration: 1000000,
              cancel: {
                label: 'Stop',
                onClick: () => {
                  controller.abort()
                  resolve('stop')
                },
              },
              action: {
                label: 'Continue',
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
    toast.success('Export success', {
      duration: 1000000,
      description: `Export success, ${getUsers().length} users`,
      cancel: undefined,
      action: {
        label: 'Download',
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
    toast.error('Export failed', {
      duration: 1000000,
      description: `Export failed, ${
        err instanceof Error ? err.message : 'Unknown error'
      }`,
      cancel: undefined,
    })
  } finally {
    toast.dismiss(toastId)
  }
}
