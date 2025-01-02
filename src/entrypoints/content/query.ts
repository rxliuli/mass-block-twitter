import { blockUser, unblockUser } from '$lib/api'
import { dbApi, User } from '$lib/db'
import {
  createMutation,
  createQuery,
  useQueryClient,
} from '@tanstack/svelte-query'
import { serializeError } from 'serialize-error'
import { toast } from 'svelte-sonner'

export function userQuery() {
  return createQuery({
    queryKey: ['users'],
    queryFn: async () => dbApi.users.getAll(),
  })
}

export function userMutation() {
  const queryClient = useQueryClient()
  const mutation = createMutation({
    mutationFn: async ({
      users,
      action,
    }: {
      users: User[]
      action: 'block' | 'unblock'
    }) => {
      let failedNames: string[] = []
      const loadingId = toast.loading(
        action === 'block' ? 'Blocking users...' : 'Unblocking users...',
      )
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        const blockingText = action === 'block' ? 'blocking' : 'unblocking'
        try {
          toast.loading(
            `[${i + 1}/${users.length}] ${blockingText} ${it.name}...`,
            { id: loadingId },
          )
          if (action === 'block') {
            await blockUser(it.id)
            await dbApi.users.block(it)
          } else {
            await unblockUser(it.id)
            await dbApi.users.unblock(it)
          }
        } catch (e) {
          failedNames.push(it.name)
          console.log(`${blockingText} ${it.id} ${it.name} failed`, e)
          toast.error(
            `[${i + 1}/${users.length}] ${blockingText} ${it.name} failed`,
            {
              description: serializeError(e).message,
            },
          )
        }
      }
      toast.dismiss(loadingId)
      toast.success(
        `${users.length - failedNames.length} users ${
          action === 'block' ? 'blocked' : 'unblocked'
        }, ${failedNames.length} failed`,
        {
          description: failedNames.join(', '),
          duration: 5000,
        },
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return mutation
}
