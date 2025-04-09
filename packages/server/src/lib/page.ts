import { z } from 'zod'

export const pageRequestSchema = z.object({
  cursor: z.string().optional(),
  count: z.number().optional(),
})
export type PageRequest = z.infer<typeof pageRequestSchema>

export type PageResponse<T> = {
  data: T[]
  cursor?: string
}
