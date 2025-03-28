import { User } from '$lib/db'
import { generateCSV } from '$lib/util/csv'
import saveAs from 'file-saver'

export function downloadUsersToCSV(users: User[], name: string) {
  const csv = generateCSV(users, {
    fields: ['id', 'screen_name', 'name', 'description', 'profile_image_url'],
  })
  saveAs(new Blob([csv]), `${name}_${new Date().toISOString()}.csv`)
}
