import { blockUser } from '$lib/api'
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

export function userBlockMutation<TData, TError, TVariables, TContext>() {
  const queryClient = useQueryClient()
  const mutation = createMutation({
    mutationFn: async (users: User[]) => {
      let failed: string[] = []
      const loadingId = toast.loading('Blocking users...')
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        try {
          toast.loading(`[${i + 1}/${users.length}] blocking ${it.name}...`, {
            id: loadingId,
          })
          await blockUser(it.id)
          await dbApi.users.block(it)
        } catch (e) {
          failed.push(it.name)
          console.log(`blocking ${it.name} failed`, e)
          toast.error(`[${i + 1}/${users.length}] blocking ${it.name} failed`, {
            description: serializeError(e).message,
          })
        }
      }
      toast.dismiss(loadingId)
      toast.success(
        `${users.length - failed.length} users blocked, ${
          failed.length
        } failed`,
        {
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
