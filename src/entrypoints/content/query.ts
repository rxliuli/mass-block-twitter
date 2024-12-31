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
    queryFn: () => dbApi.users.getAll(),
  })
}

export function userMutation<TData, TError, TVariables, TContext>() {
  const queryClient = useQueryClient()
  const mutation = createMutation({
    mutationFn: async (users: User[]) => {
      let success = 0
      toast.loading('Blocking users...')
      for (let i = 0; i < users.length; i++) {
        const it = users[i]
        try {
          await blockUser(it.id)
          await dbApi.users.block(it.id)
          toast.loading(`[${i + 1}/${users.length}] blocking ${it.name}...`)
          success++
        } catch {
          toast.error(`[${i + 1}/${users.length}] blocking ${it.name} failed`)
        }
      }
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
