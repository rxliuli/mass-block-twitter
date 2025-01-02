import { DBSchema, IDBPDatabase, openDB } from 'idb'
import { groupBy, inRange, sortBy, uniqBy } from 'lodash-es'

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
    indexes: { screen_name_index: string }
  }
}

export type DBStore = {
  idb: IDBPDatabase<MyDB>
}

export async function initDB() {
  dbStore.idb = await openDB<MyDB>('mass-db', 6, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      const usersStore = db.createObjectStore('users')

      // 检查当前数据库版本，然后执行相应的升级操作。
      if (oldVersion < 6) {
        // 收集所有的 screen_name 用于检查重复
        const allScreenNames = new Map<string, IDBValidKey>()

        // 打开游标遍历所有用户
        let cursor = await usersStore.openCursor()
        while (cursor) {
          const user: User = cursor.value
          if (allScreenNames.has(user.screen_name)) {
            await cursor.delete()
          } else {
            allScreenNames.set(user.screen_name, cursor.key)
          }
          cursor = await cursor.continue()
        }
        usersStore.createIndex('screen_name_index', 'screen_name', {
          unique: true,
        })
      }
    },
  })
}

function sortUsers(users: User[]) {
  return users.sort((a, b) => {
    if (b.created_at && b.created_at) {
      return b.created_at.localeCompare(a.created_at)
    } else {
      return 0
    }
  })
}

export class UserDAO {
  // 获取所有用户
  async getAll(): Promise<User[]> {
    const users = await dbStore.idb.getAll('users')
    return sortUsers(users)
  }
  // 记录查询过的用户
  async record(users: User[]): Promise<void> {
    await Promise.all([
      ...users.map(async (it) => {
        const keys = await dbStore.idb.getAllKeysFromIndex(
          'users',
          'screen_name_index',
          it.screen_name,
        )
        await Promise.all(keys.map((id) => dbStore.idb.delete('users', id)))
        await dbStore.idb.put('users', it, it.id)
      }),
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
