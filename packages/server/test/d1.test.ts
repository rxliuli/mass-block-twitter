import { expect, it } from 'vitest'
import { initCloudflareTest } from './utils'
import { drizzle } from 'drizzle-orm/d1'
import { user } from '../src/db/schema'

const context = initCloudflareTest()

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
