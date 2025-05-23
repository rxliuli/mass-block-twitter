import { dbApi, User } from '$lib/db'
import { QueryOperationContext } from '$lib/util/batch'
import {
  errorHandler,
  maxRequestsHandler,
  loadingHandler,
  sleepHandler,
} from '$lib/util/handlers'
import { middleware } from '$lib/util/middleware'

export async function onExportUsersProcessed(options: {
  context: QueryOperationContext<User>
  toastId: string | number
  name: string
  maxQueryCount?: number
}) {
  const title = `Exporting ${options.name}...`
  await middleware(options)
    .use(errorHandler({ title: 'Export failed' }))
    .use(
      maxRequestsHandler({
        title,
        maxRequests: options.maxQueryCount ?? 450,
      }),
    )
    .use(loadingHandler({ title }))
    .use(sleepHandler({ time: () => 1000 + Math.random() * 1000 * 2 }))
    .run()
}

export function extractScreenName(href: string) {
  const match = /^\/(.*?)\/(verified_followers|followers|following)/.exec(
    new URL(href).pathname,
  )
  if (!match) {
    return
  }
  return match[1]
}

export async function getUser(href: string) {
  const userScreenName = extractScreenName(href)
  if (!userScreenName) {
    return
  }
  return await dbApi.users.getByScreenName(userScreenName)
}
