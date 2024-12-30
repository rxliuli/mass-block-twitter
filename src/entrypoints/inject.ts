import { parseUserRecords, updateUserRecords } from '@/lib/api'
import {
  interceptFetch,
  InterceptOptions,
  interceptXHR,
} from '@/lib/interceptors'

export default defineUnlistedScript(async () => {
  const proxy: InterceptOptions = {
    async response(req, res) {
      if (req.headers.get('authorization')) {
        localStorage.setItem(
          'requestHeaders',
          JSON.stringify([...req.headers.entries()]),
        )
      }
      if (res.headers.get('content-type')?.includes('application/json')) {
        const json = await res.json()
        const users = parseUserRecords(json)
        if (users.length > 0) {
          updateUserRecords(users)
        }
      }
      return res
    },
  }
  interceptFetch(proxy)
  interceptXHR(proxy)
})
