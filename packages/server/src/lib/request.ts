import { z } from 'zod'

export const userSchema = z.object({
  id: z.string().refine(
    (id) => {
      return /^[0-9]+$/.test(id)
    },
    { message: 'id value is invalid' },
  ),
  screen_name: z.string(),
  name: z.string(),
  description: z.string().optional(),
  profile_image_url: z.string().optional(),
  created_at: z.string().optional(),
  is_blue_verified: z.boolean().optional(),
  followers_count: z.number().optional(),
  friends_count: z.number().optional(),
  default_profile: z.boolean().optional(),
  default_profile_image: z.boolean().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
})

export const tweetSchema = z.object({
  id: z.string().refine(
    (id) => {
      return /^[0-9]+$/.test(id)
    },
    { message: 'id value is invalid' },
  ),
  text: z.string(),
  created_at: z.string(),
  // TODO: remove optional when new version >0.13.2 is released
  lang: z.string().optional(),
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
  conversation_id_str: z.string().optional(),
  in_reply_to_status_id_str: z.string().optional(),
  // TODO: remove optional when new version is released
  quoted_status_id_str: z.string().optional(),
})
export type ReportSpamContextTweet = z.infer<typeof tweetSchema>

const contextSchema = z.object({
  page_url: z.string(),
  page_type: z.union([
    z.literal('timeline'),
    z.literal('tweetDetail'),
    z.literal('other'),
  ]),
  tweet: tweetSchema,
  relationTweets: z
    .array(
      z.object({
        tweet: tweetSchema,
        user: userSchema,
      }),
    )
    .optional(),
})

export const spamReportRequestSchema = z.object({
  spamUser: userSchema,
  reportUser: userSchema,
  context: contextSchema,
})

export type ErrorResponse<T = string> = {
  code: T
}
