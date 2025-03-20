import { DBSchema, IDBPDatabase, openDB } from 'idb'
import { pickBy, sortBy } from 'lodash-es'
import { ulid } from 'ulidx'

export const dbStore: DBStore = {} as any

export interface User {
  id: string
  screen_name: string
  name: string
  description?: string
  profile_image_url?: string
  created_at?: string
  updated_at: string // add to idb time
  followers_count?: number
  friends_count?: number
  is_blue_verified?: boolean
  default_profile?: boolean
  default_profile_image?: boolean
  location?: string
  url?: string // profile url

  blocking: boolean // local only
  following?: boolean // local only
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
  conversation_id_str: string
  in_reply_to_status_id_str?: string
  quoted_status_id_str?: string
  created_at: string
  updated_at: string // add to idb time
  lang: string // ISO 639-1
}

export interface Activity {
  id: string
  created_at: string
  updated_at: string
  action: 'block' | 'hide'
  trigger_type: 'auto' | 'manual'
  match_type: 'user' | 'tweet'
  match_filter:
    | 'mutedWords'
    | 'defaultProfile'
    | 'blueVerified'
    | 'sharedSpam'
    | 'modList'
    | 'language'
    | 'batchSelected'
  user_id: string
  user_name: string
  user_screen_name: string
  user_profile_image_url?: string
  tweet_id?: string
  tweet_content?: string
  location?: string
}

export interface PendingCheckUser {
  id: string // user id
  created_at: string
  updated_at: string
  status: 'pending' | 'checked'
}

export interface SpamUser {
  id: string // user id
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
  tweets: {
    key: string
    value: Tweet
    indexes: {
      user_id_index: string
    }
  }
  activitys: {
    key: string
    value: Activity
    indexes: {
      created_at_index: string
    }
  }
  pendingCheckUsers: {
    key: string
    value: PendingCheckUser
    indexes: {
      status_index: string
    }
  }
  spamUsers: {
    key: string
    value: SpamUser
  }
}

export type DBStore = {
  idb: IDBPDatabase<MyDB>
}

export async function initDB() {
  dbStore.idb = await openDB<MyDB>('mass-db', 16, {
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
      }
      if (oldVersion < 15) {
        const activityStore = db.createObjectStore('activitys')
        activityStore.createIndex('created_at_index', 'created_at')
      }
      if (oldVersion < 16) {
        db.createObjectStore('pendingCheckUsers').createIndex(
          'status_index',
          'status',
        )
        db.createObjectStore('spamUsers')
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
  async getByPage(params: { limit: number; cursor?: number }): Promise<{
    data: User[]
    cursor: number | undefined
  }> {
    let cursorRequest = await dbStore.idb
      .transaction('users', 'readonly')
      .store.index('updated_at_index')
      .openCursor(null, 'prev')
    if (params.cursor && cursorRequest) {
      cursorRequest = await cursorRequest.advance(params.cursor)
    }
    let count = 0
    const data: User[] = []
    let cursor = params.cursor ?? 0
    while (cursorRequest) {
      if (cursorRequest.value.blocking) {
        data.push(cursorRequest.value)
        count++
      }
      cursor++
      if (count >= params.limit) {
        break
      }
      cursorRequest = await cursorRequest.continue()
    }
    return {
      data,
      cursor: data.length === params.limit ? cursor : undefined,
    }
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

class ActivityDAO {
  async record(activities: Activity[]): Promise<void> {
    await Promise.all(
      activities.map(async (it) => {
        await dbStore.idb.put('activitys', it, it.id)
      }),
    )
  }
  async getByRange(from: Date, to: Date): Promise<Activity[]> {
    return dbStore.idb.getAllFromIndex(
      'activitys',
      'created_at_index',
      IDBKeyRange.bound(from.toISOString(), to.toISOString()),
    )
  }
  async getByPage(params: { limit: number; cursor?: string }): Promise<{
    data: Activity[]
    cursor: string | undefined
  }> {
    const cursor = params.cursor ?? ulid().toString()
    const range = IDBKeyRange.upperBound(cursor, true)
    let cursorRequest = await dbStore.idb
      .transaction('activitys', 'readonly')
      .store.openCursor(range, 'prev')
    let count = 0
    const data: (Activity & { user_profile_image_url?: string })[] = []
    while (cursorRequest) {
      data.push(cursorRequest.value)
      count++
      cursorRequest = await cursorRequest.continue()
      if (count >= params.limit) {
        break
      }
    }
    return {
      data,
      cursor:
        data.length === params.limit ? data[data.length - 1]?.id : undefined,
    }
  }
}

class PendingCheckUserDAO {
  async record(userIds: string[]): Promise<void> {
    await Promise.all(
      userIds.map(async (it) => {
        const store = await dbStore.idb.get('pendingCheckUsers', it)
        if (store) {
          // if (
          //   new Date().getTime() - new Date(store.created_at).getTime() <
          //   1000 * 60 * 60 * 24
          // ) {
          //   return
          // }
          return
        }
        if (await dbStore.idb.get('spamUsers', it)) {
          return
        }
        await dbStore.idb.put(
          'pendingCheckUsers',
          {
            id: it,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'pending',
          },
          it,
        )
      }),
    )
  }
  async list(): Promise<
    {
      user: User
      tweets: Tweet[]
    }[]
  > {
    const userIds = await dbStore.idb.getAllKeysFromIndex(
      'pendingCheckUsers',
      'status_index',
      'pending',
    )
    const list = await Promise.all(
      userIds.map(async (userId) => {
        const user = await dbStore.idb.get('users', userId)
        if (
          !user ||
          user.followers_count === undefined ||
          user.friends_count === undefined ||
          user.is_blue_verified === undefined
        ) {
          return
        }
        const tweets = sortBy(
          await dbStore.idb.getAllFromIndex('tweets', 'user_id_index', userId),
          (it) => -new Date(it.created_at).getTime(),
        ).slice(0, 10)
        return {
          user,
          tweets,
        }
      }),
    )
    return list.filter((it) => it !== undefined)
  }

  async updateStatus(
    userIds: string[],
    status: 'pending' | 'checked',
  ): Promise<void> {
    await Promise.all(
      userIds.map(async (userId) => {
        const user = await dbStore.idb.get('pendingCheckUsers', userId)
        if (!user) {
          return
        }
        await dbStore.idb.put(
          'pendingCheckUsers',
          {
            ...user,
            updated_at: new Date().toISOString(),
            status,
          },
          userId,
        )
      }),
    )
  }
}

class SpamUserDAO {
  async record(userIds: string[]): Promise<void> {
    await Promise.all(
      userIds.map(async (userId) => {
        await dbStore.idb.put(
          'spamUsers',
          {
            id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          userId,
        )
      }),
    )
  }
  async has(userId: string): Promise<boolean> {
    return !!(await dbStore.idb.getKey('spamUsers', userId))
  }
}

export const dbApi = {
  users: wrap(new UserDAO()),
  tweets: wrap(new TweetDAO()),
  activitys: wrap(new ActivityDAO()),
  pendingCheckUsers: wrap(new PendingCheckUserDAO()),
  spamUsers: wrap(new SpamUserDAO()),
  clear: async () => {
    if (!dbStore.idb) {
      await initDB()
    }
    await dbStore.idb.clear('users')
    await dbStore.idb.clear('tweets')
    await dbStore.idb.clear('activitys')
    await dbStore.idb.clear('pendingCheckUsers')
    await dbStore.idb.clear('spamUsers')
  },
}
