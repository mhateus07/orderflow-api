import { afterAll, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma'

// Truncate all tables in dependency order before each test
beforeEach(async () => {
  await prisma.$transaction([
    prisma.actionLog.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
  ])
})

afterAll(async () => {
  await prisma.$disconnect()
})
