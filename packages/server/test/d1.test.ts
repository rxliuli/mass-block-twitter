import { beforeEach, describe, expect, it } from 'vitest'
import { initCloudflareTest } from './utils'
import { drizzle } from 'drizzle-orm/d1'
import {
  localUser,
  modList,
  modListRule,
  modListUser,
  tweet,
  user,
} from '../src/db/schema'
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
import { last, omit, range, sum, uniq } from 'es-toolkit'

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
  it('should be able to use index', async () => {
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
    const r = await context.env.DB.prepare(sql.sql)
      .bind(...sql.params)
      .run()
    expect(r.meta.rows_read).eq(20)
  })
  // update 时应该永远排除 id
  it('should be able to update user', async () => {
    const db = context.db
    await db.batch([
      db.insert(user).values({
        id: `test-user-1`,
        screenName: `test-screen-name-1`,
        name: `test-name-1`,
      }),
      ...range(1000).map((it) =>
        db.insert(tweet).values({
          id: `test-tweet-${it}`,
          userId: `test-user-1`,
          text: `test-text-${it}`,
          publishedAt: new Date().toISOString(),
        }),
      ),
    ] as any)
    const userParam: InferInsertModel<typeof user> = {
      id: 'test-user-1',
      screenName: 'test',
    }
    const r1 = await db
      .update(user)
      .set(userParam)
      .where(eq(user.id, userParam.id))
    expect(r1.meta.rows_read).gt(2000)
    const r2 = await db
      .update(user)
      .set(omit(userParam, ['id']))
      .where(eq(user.id, userParam.id))
    expect(r2.meta.rows_read).eq(1)
  })
  // 不要大量使用 leftJoin 查询
  it('should be able to use leftJoin', async () => {
    const db = context.db
    await db.batch([
      ...range(100).map((it) =>
        db.insert(user).values({
          id: `test-user-${it}`,
          screenName: `user-${it}`,
          name: `user-${it}`,
        }),
      ),
      db.insert(localUser).values({
        id: `local-user-1`,
        email: `local-user-1@example.com`,
        password: `password`,
      }),
      db.insert(modList).values({
        id: `modlist-1`,
        name: `modlist-name`,
        localUserId: `local-user-1`,
        twitterUserId: `test-user-1`,
      }),
      ...range(100).map((it) =>
        db.insert(modListUser).values({
          id: `modlist-user-${it}`,
          modListId: `modlist-1`,
          twitterUserId: `test-user-${it}`,
        }),
      ),
      ...range(100).map((it) =>
        db.insert(modListRule).values({
          id: `modlist-rule-${it}`,
          modListId: `modlist-1`,
          name: `rule-${it}`,
          rule: { or: [] },
        }),
      ),
    ] as any)
    const stmt1 = db
      .select()
      .from(modList)
      .leftJoin(modListUser, eq(modList.id, modListUser.modListId))
      .leftJoin(modListRule, eq(modList.id, modListRule.modListId))
      .where(eq(modList.id, 'modlist-1'))
      .toSQL()
    const r1 = await context.env.DB.prepare(stmt1.sql)
      .bind(...stmt1.params)
      .run()
    expect(r1.meta.rows_read).gt(10000)

    const stmt2 = db
      .select()
      .from(modListUser)
      .where(eq(modListUser.modListId, 'modlist-1'))
      .toSQL()
    const stmt3 = db
      .select()
      .from(modListRule)
      .where(eq(modListRule.modListId, 'modlist-1'))
      .toSQL()
    const r2 = await context.env.DB.prepare(stmt2.sql)
      .bind(...stmt2.params)
      .run()
    const r3 = await context.env.DB.prepare(stmt3.sql)
      .bind(...stmt3.params)
      .run()
    expect(r2.meta.rows_read).eq(100)
    expect(r3.meta.rows_read).eq(100)
  })
  // 插入时尽可能在一条 insert 中插入多个记录
  it('should be able to insert multiple records', async () => {
    const db = context.db
    const len = 5000
    const users = range(len).map((it) => ({
      id: `test-user-${it}`,
      screenName: `user-${it}`,
      name: `user-${it}`,
    }))
    const r1 = await Promise.all(
      users.slice((len / 3) * 2).map((it) => db.insert(user).values(it)) as any,
    )
    const r2 = (await db.batch(
      users
        .slice(len / 3, (len / 3) * 2)
        .map((it) => db.insert(user).values(it)) as any,
    )) as D1Result[]
    const r3 = (await db.batch(
      safeChunkInsertValues(user, users.slice(0, len / 3)).map((it) =>
        db.insert(user).values(it),
      ) as any,
    )) as D1Result[]

    const time1 = sum(r1.map((it) => it.meta.duration))
    const time2 = sum(r2.map((it) => it.meta.duration))
    const time3 = sum(r3.map((it) => it.meta.duration))
    // console.log(time1, time2, time3)
    expect(time3).lt(time2).lt(time1)
  })
})
