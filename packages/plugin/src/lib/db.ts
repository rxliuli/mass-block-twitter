import { DBSchema, IDBPDatabase, openDB } from 'idb'
import { chunk, difference, pickBy, sortBy } from 'es-toolkit'
import { ulid } from 'ulidx'
import { once } from './util/once'
import { limitFunction } from 'p-limit'

export interface KeyValItem {
  value: any
  createdAt?: number // ms timestamp
  expirationTtl?: number // living seconds
}

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

  verification_verified?: boolean
  // Government https://x.com/realDonaldTrump
  // Business https://x.com/Limportant_fr
  verification_verified_type?: 'Government' | 'Business'

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
  source: string
  is_ad?: boolean
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
    | 'grok'
    | 'ad'
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
  pendingCheckUserIds: {
    key: string
    value: KeyValItem
  }
  uploadedCheckUserIds: {
    key: string
    value: KeyValItem
  }
}

export type DBStore = {
  idb: IDBPDatabase<MyDB>
}

export const initDB = once(async () => {
  dbStore.idb = await openDB<MyDB>('mass-db', 23, {
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
      if (oldVersion < 17) {
        db.createObjectStore('pendingCheckUserIds')
        db.createObjectStore('uploadedCheckUserIds')
      }
    },
  })
})

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
    if (users.length === 0) {
      return
    }
    const db = dbStore.idb
    const tx = db.transaction('users', 'readwrite')
    const store = tx.objectStore('users')

    console.debug('record', users.length)
    await Promise.all([
      ...users.map(
        limitFunction(
          async (it) => {
            const u = await store.get(it.id)
            const value = {
              ...u,
              ...(pickBy(it, (it) => it !== undefined && it !== null) as User),

              updated_at: u?.updated_at ?? new Date().toISOString(),
            }
            await store.put(value, it.id)
          },
          { concurrency: 100 },
        ),
      ),
      tx.done,
    ])
    console.debug('record done')
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
  async getByScreenName(screenName: string): Promise<User | undefined> {
    return dbStore.idb.getFromIndex('users', 'screen_name_index', screenName)
  }
}

class TweetDAO {
  async record(tweets: Tweet[]): Promise<void> {
    const tx = dbStore.idb.transaction('tweets', 'readwrite')
    const store = tx.objectStore('tweets')
    await Promise.all(
      tweets.map(async (it) => {
        await store.put(it, it.id)
      }),
    )
    await tx.done
  }
  async get(id: string): Promise<Tweet | undefined> {
    return dbStore.idb.get('tweets', id)
  }
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

interface KeyValSetOptions {
  expirationTtl?: number // living seconds
}

class InternalKeyVal {
  constructor(
    private storeName: 'pendingCheckUserIds' | 'uploadedCheckUserIds',
    private defaultExpirationTtl?: number,
  ) {}

  private isExpired(item: KeyValItem): boolean {
    const ttl = item.expirationTtl ?? this.defaultExpirationTtl
    if (!ttl || !item.createdAt) {
      return false
    }
    return Date.now() >= item.createdAt + ttl * 1000
  }

  async get(key: string): Promise<any | null> {
    const item = await dbStore.idb.get(this.storeName, key)
    if (!item) {
      return null
    }
    if (this.isExpired(item)) {
      await dbStore.idb.delete(this.storeName, key)
      return null
    }
    return item.value
  }

  async set(key: string, value: any, options?: KeyValSetOptions): Promise<void> {
    await dbStore.idb.put(
      this.storeName,
      {
        value,
        createdAt: Date.now(),
        expirationTtl: options?.expirationTtl,
      },
      key,
    )
  }

  async setMany(
    items: { key: string; value: any; options?: KeyValSetOptions }[],
  ): Promise<void> {
    const tx = dbStore.idb.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)
    await Promise.all([
      ...items.map((it) =>
        store.put(
          {
            value: it.value,
            createdAt: Date.now(),
            expirationTtl: it.options?.expirationTtl,
          },
          it.key,
        ),
      ),
      tx.done,
    ])
  }

  async getMany(keys: string[]): Promise<{ key: string; value?: any }[]> {
    const tx = dbStore.idb.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)
    const items = await Promise.all(keys.map((key) => store.get(key)))
    const delKeys: string[] = []
    const result = items.map((item, index) => {
      const key = keys[index]
      if (!item) {
        return { key }
      }
      if (this.isExpired(item)) {
        delKeys.push(key)
        return { key }
      }
      return { key, value: item.value }
    })
    if (delKeys.length > 0) {
      await Promise.all(delKeys.map((key) => store.delete(key)))
    }
    await tx.done
    return result
  }

  async del(key: string): Promise<void> {
    await dbStore.idb.delete(this.storeName, key)
  }

  async delMany(keys: string[]): Promise<void> {
    const tx = dbStore.idb.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)
    await Promise.all([...keys.map((key) => store.delete(key)), tx.done])
  }

  async keys(): Promise<string[]> {
    const tx = dbStore.idb.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)
    const allKeys = await store.getAllKeys()
    const validKeys: string[] = []
    const delKeys: string[] = []
    for (const key of allKeys) {
      const item = await store.get(key)
      if (!item) {
        continue
      }
      if (this.isExpired(item)) {
        delKeys.push(key)
        continue
      }
      validKeys.push(key)
    }
    if (delKeys.length > 0) {
      await Promise.all(delKeys.map((key) => store.delete(key)))
    }
    await tx.done
    return validKeys
  }
}

class PendingCheckUserDAO {
  private pendingCheckUserIds = new InternalKeyVal(
    'pendingCheckUserIds',
    60 * 60 * 24 * 7, // 1 week
  )
  private uploadedCheckUserIds = new InternalKeyVal(
    'uploadedCheckUserIds',
    60 * 60 * 24 * 7, // 1 week
  )

  async record(userIds: string[]): Promise<void> {
    const uploaded = await this.uploadedCheckUserIds.getMany(userIds)
    const list = difference(
      userIds,
      uploaded.filter((it) => it.value).map((it) => it.key),
    )
    await this.pendingCheckUserIds.setMany(
      list.map((it) => ({
        key: it,
        value: true,
      })),
    )
  }

  async *keys(): AsyncGenerator<
    {
      user: User
      tweets: Tweet[]
    }[]
  > {
    let userIds = await this.pendingCheckUserIds.keys()
    const uploaded = (await this.uploadedCheckUserIds.getMany(userIds)).filter(
      (it) => it.value,
    )
    await this.pendingCheckUserIds.delMany(uploaded.map((it) => it.key))
    userIds = difference(
      userIds,
      uploaded.map((it) => it.key),
    ).filter((it) => it)
    for (const chunks of chunk(userIds, 50)) {
      const delKeys: string[] = []
      const list = await Promise.all(
        chunks.map(async (userId) => {
          const user = await dbStore.idb.get('users', userId)
          if (
            !user ||
            user.followers_count === undefined ||
            user.friends_count === undefined ||
            user.is_blue_verified === undefined
          ) {
            delKeys.push(userId)
            return
          }
          const tweets = sortBy(
            await dbStore.idb.getAllFromIndex(
              'tweets',
              'user_id_index',
              userId,
            ),
            [(it) => -new Date(it.created_at).getTime()],
          ).slice(0, 10)
          return {
            user,
            tweets,
          }
        }),
      )
      await this.pendingCheckUserIds.delMany(delKeys)
      yield list.filter((it) => it !== undefined)
    }
  }

  async uploaded(userIds: string[], ttl?: number): Promise<void> {
    await this.uploadedCheckUserIds.setMany(
      userIds.map((userId) => ({
        key: userId,
        value: true,
        options: {
          expirationTtl: ttl,
        },
      })),
    )
    await this.pendingCheckUserIds.delMany(userIds)
  }
}

class SpamUserDAO {
  async record(userIds: string[]): Promise<void> {
    const tx = dbStore.idb.transaction('spamUsers', 'readwrite')
    const store = tx.objectStore('spamUsers')
    await Promise.all(
      userIds.map(async (userId) => {
        await store.put(
          {
            id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          userId,
        )
      }),
    )
    await tx.done
  }
  async isSpam(userIds: string[]): Promise<string[]> {
    const tx = dbStore.idb.transaction('spamUsers', 'readonly')
    const store = tx.objectStore('spamUsers')
    const spamUserIds = await Promise.all(
      userIds.map(async (userId) => {
        const exists = await store.getKey(userId)
        return exists ? userId : undefined
      }),
    )
    await tx.done
    return spamUserIds.filter((id): id is string => id !== undefined)
  }
}

export const dbApi = {
  users: new UserDAO(),
  tweets: new TweetDAO(),
  activitys: new ActivityDAO(),
  pendingCheckUsers: new PendingCheckUserDAO(),
  spamUsers: new SpamUserDAO(),
  clear: async () => {
    if (!dbStore.idb) {
      await initDB()
    }
    await dbStore.idb.clear('users')
    await dbStore.idb.clear('tweets')
    await dbStore.idb.clear('activitys')
    await dbStore.idb.clear('pendingCheckUsers')
    await dbStore.idb.clear('pendingCheckUserIds')
    await dbStore.idb.clear('uploadedCheckUserIds')
    await dbStore.idb.clear('spamUsers')
  },
}
