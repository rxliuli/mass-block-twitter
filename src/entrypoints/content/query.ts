import { blockUser } from '$lib/api'
import { dbApi, User } from '$lib/db'
import {
  createMutation,
  createQuery,
  useQueryClient,
} from '@tanstack/svelte-query'
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
      let success = 0
      const loadingId = toast.loading('Blocking users...')
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        try {
          await blockUser(it.id)
          await dbApi.users.block(it)
          toast.loading(`[${i + 1}/${users.length}] blocking ${it.name}...`, {
            id: loadingId,
          })
          success++
        } catch {
          toast.error(`[${i + 1}/${users.length}] blocking ${it.name} failed`)
        }
      }
      toast.dismiss(loadingId)
      toast.success(
        `${success} users blocked, ${users.length - success} failed`,
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
