import { DBSchema, IDBPDatabase, openDB } from 'idb'
import { sortBy } from 'lodash-es'

export const dbStore: DBStore = {} as any

export interface User {
  id: string
  blocking: boolean
  screen_name: string
  name: string
  description?: string
  profile_image_url?: string
  created_at: string
  updated_at: string
}

export interface MyDB extends DBSchema {
  users: {
    key: string
    value: User
  }
}

export type DBStore = {
  idb: IDBPDatabase<MyDB>
}

export async function initDB() {
  dbStore.idb = await openDB<MyDB>('mass-db', 1, {
    upgrade(db) {
      db.createObjectStore('users')
    },
  })
}
export class UserDAO {
  // 获取所有用户
  async getAll(): Promise<User[]> {
    const users = await dbStore.idb.getAll('users')
    return users.sort((a, b) => {
      if (b.created_at && b.created_at) {
        return b.created_at.localeCompare(a.created_at)
      } else {
        return 0
      }
    })
  }
  // 记录查询过的用户
  async record(users: User[]): Promise<void> {
    await Promise.all([
      ...users.map((it) => dbStore.idb.put('users', it, it.id)),
    ])
  }
  // block 特定用户
  async block(user: User): Promise<void> {
    await dbStore.idb.put(
      'users',
      {
        ...user,
        blocking: true,
        updated_at: new Date().toISOString(),
      },
      user.id,
    )
  }
}

function wrap<T extends object>(obj: T): T {
  return new Proxy<T>({} as any, {
    get(_, p) {
      if (!(p in obj)) {
        return
      }
      if (typeof obj[p as keyof T] !== 'function') {
        return
      }
      return async (...args: any[]) => {
        if (!dbStore.idb) {
          await initDB()
        }
        return (obj[p as keyof T] as any)(...args)
      }
    },
  })
}

export const dbApi = {
  users: wrap(new UserDAO()),
}
