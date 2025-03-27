import { beforeEach, describe, expect, it } from 'vitest'
import { initCloudflareTest } from './utils'
import { drizzle } from 'drizzle-orm/d1'
import { localUser, modList, modListUser, user } from '../src/db/schema'
import {
  and,
  AnyTable,
  desc,
  eq,
  getTableColumns,
  getTableName,
  InferInsertModel,
  InferSelectModel,
  lt,
  sql,
  TableConfig,
} from 'drizzle-orm'
import {
  getTableAliasedColumns,
  safeChunkInsertValues,
} from '../src/lib/drizzle'
import { last, range, uniq } from 'es-toolkit'

const context = initCloudflareTest()

describe('drizzle', () => {
  it('should be create user by d1 batch', async () => {
    const db = drizzle(context.env.DB)
    const result = await db.batch([
      db
        .insert(user)
        .values({
          id: '1',
          screenName: '1',
          name: '1',
        })
        .returning(),
      db
        .insert(user)
        .values({
          id: '2',
          screenName: '2',
          name: '2',
        })
        .returning(),
    ])
    expect(result).length(2)
  })
  it('should be create tweet but one failed by d1 batch', async () => {
    const db = drizzle(context.env.DB)
    await expect(
      db.batch([
        db
          .insert(user)
          .values({ id: '1', screenName: '1', name: '1' })
          .returning(),
        db
          .insert(user)
          .values({ id: '1', screenName: '2', name: '2' })
          .returning(),
      ]),
    ).rejects.toThrowError()
    const result = await db.select().from(user).all()
    expect(result).length(0)
  })
})

describe('d1 batch', () => {
  beforeEach(async () => {
    const db = context.db
    await db.batch([
      db.insert(localUser).values({
        id: 'local-user-1',
        email: 'local-user-1@example.com',
        password: 'password',
      }),
      db.insert(user).values({
        id: 'user-1',
        screenName: 'user-screen-name',
        name: 'user-name',
      }),
      db.insert(modList).values({
        id: 'modlist-1',
        name: 'modlist-name',
        twitterUserId: 'user-1',
        localUserId: 'local-user-1',
      }),
    ])
  })
  it('should be able to batch', async () => {
    const db = context.db
    const query = db
      .select({
        modList: getTableAliasedColumns(modList),
        user: getTableAliasedColumns(user),
      })
      .from(modList)
      .innerJoin(user, eq(user.id, modList.twitterUserId))
      .where(eq(modList.id, 'modlist-1'))
    const r1 = await query
    const [r2] = await db.batch([query])
    expect(r1).toEqual(r2)
    expect<
      {
        modList: InferSelectModel<typeof modList>
        user: InferSelectModel<typeof user>
      }[]
    >(r1)
  })
  it('should be able to upsert user', async () => {
    const db = context.db
    const r = await db
      .update(user)
      .set({
        screenName: 'test',
      })
      .where(eq(user.id, 'test'))
    expect(r.meta.rows_written).eq(0)
  })
  it('should be able to auto chunk with d1 batch', async () => {
    const db = drizzle(context.env.DB)
    const list = range(17).map((it) => ({
      id: `test-user-${it}`,
      screenName: `user-${it}`,
      name: `user-${it}`,
    }))
    await expect(db.insert(user).values(list)).rejects.toThrowError()
    const chunks = safeChunkInsertValues(user, list)
    expect(chunks.length).eq(2)
    await db.batch(chunks.map((it) => db.insert(user).values(it)) as any)
  })
  it('should be able to upsert users', async () => {
    const db = context.db
    await db.insert(user).values([
      {
        id: 'test-user-1',
        screenName: 'test-user-1',
        name: 'test-user-1',
      },
    ])
    await db
      .insert(user)
      .values([
        {
          id: 'test-user-1',
          screenName: 'test-user-1',
          name: 'test-user-1',
        },
      ])
      .onConflictDoNothing({
        target: user.id,
      })
  })
})

describe('performance', () => {
  beforeEach(async () => {
    const db = context.db
    const users = range(1000).map((it) => ({
      id: `test-user-${it}`,
      screenName: `user-${it}`,
      name: `user-${it}`,
    }))
    await db.batch(
      safeChunkInsertValues(user, users).map((it) =>
        db.insert(user).values(it),
      ) as any,
    )
    await db.insert(localUser).values({
      id: 'local-user-1',
      email: 'local-user-1@example.com',
      password: 'password',
    })
    await db.insert(modList).values({
      id: 'modlist-1',
      name: 'modlist-name',
      twitterUserId: 'test-user-1',
      localUserId: 'local-user-1',
    })
    const modListUsers = range(1000).map((it) => ({
      id: `modlist-user-${it}`,
      modListId: 'modlist-1',
      twitterUserId: `test-user-${it}`,
    }))
    await db.batch(
      safeChunkInsertValues(modListUser, modListUsers).map((it) =>
        db.insert(modListUser).values(it),
      ) as any,
    )
  })
  it('should be able to use index', async () => {
    const db = context.db
    const sql = db
      .select()
      .from(modListUser)
      .innerJoin(user, eq(modListUser.twitterUserId, user.id))
      .where(
        and(
          eq(modListUser.modListId, 'modlist-1'),
          lt(modListUser.id, 'modlist-user-500'),
        ),
      )
      .orderBy(desc(modListUser.id))
      .limit(10)
      .toSQL()
    const r2 = await context.env.DB.prepare(sql.sql)
      .bind(...sql.params)
      .run()
    expect(r2.meta.rows_read).eq(20)
  })
})
