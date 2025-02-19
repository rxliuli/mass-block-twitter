import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

export const prismaClients = {
  hooks: [] as Parameters<PrismaClient['$extends']>[0][],
  async fetch(db: D1Database) {
    const adapter = new PrismaD1(db)
    const prisma = prismaClients.hooks.reduce((acc, hook) => {
      return acc.$extends(hook) as any
    }, new PrismaClient({ adapter }))
    return prisma
  },
}
