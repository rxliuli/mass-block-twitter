import { DBSchema, IDBPDatabase, openDB } from 'idb'
import { pickBy } from 'lodash-es'

export const dbStore: DBStore = {} as any

export interface User {
  id: string
  blocking: boolean
  following?: boolean
  screen_name: string
  name: string
  description?: string
  profile_image_url?: string
  followers_count?: number
  default_profile?: boolean
  default_profile_image?: boolean
  created_at?: string
  updated_at: string // add to idb time
}

export type TweetMediaType = 'photo' | 'video' | 'animated_gif'

export interface Tweet {
  id: string
  text: string
  media?: {
    url: string
    type: TweetMediaType
  }[]
  user_id: string
  created_at: string
  updated_at: string // add to idb time
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
  tweets: {
    key: string
    value: Tweet
    indexes: {
      user_id_index: string
    }
  }
}

export type DBStore = {
  idb: IDBPDatabase<MyDB>
}

export async function initDB() {
  dbStore.idb = await openDB<MyDB>('mass-db', 13, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      if (db.objectStoreNames.length === 0) {
        // init users store
        const userStore = db.createObjectStore('users')
        userStore.createIndex('updated_at_index', 'updated_at')
        userStore.createIndex('screen_name_index', 'screen_name', {
          unique: true,
        })
        const tweetsStore = db.createObjectStore('tweets')
        tweetsStore.createIndex('user_id_index', 'user_id')
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
        if (oldVersion < 11) {
          const tweetsStore = db.createObjectStore('tweets')
          tweetsStore.createIndex('user_id_index', 'user_id')
        }
      }
    },
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
  async get(id: string): Promise<User | undefined> {
    return dbStore.idb.get('users', id)
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
        const u = await dbStore.idb.get('users', it.id)
        const value = {
          ...u,
          ...(pickBy(it, (it) => it !== undefined && it !== null) as User),
        }
        await dbStore.idb.put('users', value, it.id)
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

class TweetDAO {
  async record(tweets: Tweet[]): Promise<void> {
    await Promise.all(
      tweets.map(async (it) => {
        await dbStore.idb.put('tweets', it, it.id)
      }),
    )
  }
  async get(id: string): Promise<Tweet | undefined> {
    return dbStore.idb.get('tweets', id)
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
  tweets: wrap(new TweetDAO()),
  clear: async () => {
    await dbStore.idb.clear('users')
    await dbStore.idb.clear('tweets')
  },
}
