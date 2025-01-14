import { DBSchema, IDBPDatabase, openDB } from 'idb'

export const dbStore: DBStore = {} as any

export interface User {
  id: string
  blocking: boolean
  following?: boolean
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
    indexes: {
      screen_name_index: string
      updated_at_index: string
    }
  }
}

export type DBStore = {
  idb: IDBPDatabase<MyDB>
}

export async function initDB() {
  dbStore.idb = await openDB<MyDB>('mass-db', 10, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('users')) {
        // init users store
        const userStore = db.createObjectStore('users')
        userStore.createIndex('updated_at_index', 'updated_at')
        userStore.createIndex('screen_name_index', 'screen_name', {
          unique: true,
        })
      } else {
        const usersStore = transaction.objectStore('users')
        if (oldVersion < 6) {
          const allScreenNames = new Map<string, IDBValidKey>()
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
        if (oldVersion < 9) {
          let cursor = await usersStore.openCursor()
          while (cursor) {
            const user: User = cursor.value
            if (!user.following) {
              user.following = false
            }
            cursor.update(user)
            cursor = await cursor.continue()
          }
        }
        if (oldVersion < 10) {
          usersStore.createIndex('updated_at_index', 'updated_at')
        }
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
  async getAll(limit: number = 1000): Promise<User[]> {
    let cursor = await dbStore.idb
      .transaction('users', 'readonly')
      .store.index('updated_at_index')
      .openCursor(null, 'prev')
    const users: User[] = []
    while (cursor) {
      users.push(cursor.value)
      cursor = await cursor.continue()
      limit--
      if (limit <= 0) {
        break
      }
    }
    return users
  }
  // 获取所有 blocking 用户
  async isBlocking(id: string): Promise<boolean> {
    const user = await dbStore.idb.get('users', id)
    return user?.blocking ?? false
  }
  // 记录查询过的用户
  async record(users: User[]): Promise<void> {
    await Promise.all([
      ...users.map(async (it) => {
        // const keys = await dbStore.idb.getAllKeysFromIndex(
        //   'users',
        //   'screen_name_index',
        //   it.screen_name,
        // )
        // await Promise.all(keys.map((id) => dbStore.idb.delete('users', id)))
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
  // unblock 特定用户
  async unblock(user: User): Promise<void> {
    await dbStore.idb.put(
      'users',
      {
        ...user,
        blocking: false,
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
