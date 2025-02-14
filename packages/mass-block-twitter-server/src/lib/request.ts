import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  screen_name: z.string(),
  name: z.string(),
  description: z.string().optional(),
  profile_image_url: z.string().optional(),
  created_at: z.string().optional(),
})

export const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  created_at: z.string(),
  media: z
    .array(
      z.object({
        type: z.union([
          z.literal('photo'),
          z.literal('video'),
          z.literal('animated_gif'),
        ]),
        url: z.string(),
      }),
    )
    .optional(),
})

const contextSchema = z.object({
  page_url: z.string(),
  page_type: z.union([
    z.literal('timeline'),
    z.literal('tweetDetail'),
    z.literal('other'),
  ]),
  tweet: tweetSchema,
})

export const spamReportRequestSchema = z.object({
  spamUser: userSchema,
  reportUser: userSchema,
  context: contextSchema,
})

export type ErrorResponse<T = string> = {
  code: T
}
