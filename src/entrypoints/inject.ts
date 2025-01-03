import { autoBlockUsers, parseUserRecords } from '$lib/api'
import { dbApi } from '$lib/db'
import { interceptFetch, interceptXHR, Middleware } from '$lib/interceptors'
import { differenceBy, uniqBy } from 'lodash-es'
import { mount } from 'svelte'
import { toast, Toaster } from 'svelte-sonner'

export default defineUnlistedScript(async () => {
  const middleware: Middleware = async (c, next) => {
    await next()
    if (c.req.headers.get('authorization')) {
      localStorage.setItem(
        'requestHeaders',
        JSON.stringify([...c.req.headers.entries()]),
      )
    }
    if (c.res.headers.get('content-type')?.includes('application/json')) {
      const json = await c.res.json()
      const users = uniqBy(parseUserRecords(json), 'id')
      if (users.length > 0) {
        await dbApi.users.record(users)
      }
    }
  }
  interceptFetch(middleware)
  interceptXHR(middleware)

  createToaster()
  toast('Hello, world!')
})

function createToaster() {
  const toaster = document.createElement('div')
  toaster.id = 'toaster'
  document.body.appendChild(toaster)
  mount(Toaster, {
    target: toaster,
    props: {
      richColors: true,
    },
  })
}
