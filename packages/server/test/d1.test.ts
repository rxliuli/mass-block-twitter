import { beforeEach, describe, expect, it } from 'vitest'
import { initCloudflareTest } from './utils'
import { drizzle } from 'drizzle-orm/d1'
import { localUser, modList, user } from '../src/db/schema'
import { eq, InferSelectModel } from 'drizzle-orm'
import { getTableAliasedColumns } from '../src/lib/drizzle'

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
})
