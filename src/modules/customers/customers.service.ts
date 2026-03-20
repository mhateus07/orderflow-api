import { prisma } from '../../lib/prisma'
import { AppError } from '../../shared/errors/app-error'
import { getPaginationParams, buildPaginatedResult } from '../../shared/utils/paginate'
import { logAction } from '../../shared/utils/action-log'
import { CreateCustomerInput, UpdateCustomerInput, CustomerQuery } from './customers.schemas'

export async function listCustomersService(tenantId: string, query: CustomerQuery) {
  const { page, limit, skip } = getPaginationParams(query)

  const where = {
    tenantId,
    deletedAt: null,
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { phone: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.customer.count({ where }),
  ])

  return buildPaginatedResult(customers, total, page, limit)
}

export async function getCustomerService(tenantId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    include: {
      orders: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, status: true, total: true, createdAt: true },
      },
    },
  })
  if (!customer) throw new AppError('Customer not found', 404)
  return customer
}

export async function createCustomerService(
  tenantId: string,
  actorId: string,
  data: CreateCustomerInput,
) {
  const customer = await prisma.customer.create({ data: { tenantId, ...data } })

  await logAction({ tenantId, userId: actorId, action: 'CREATE', entity: 'Customer', entityId: customer.id })

  return customer
}

export async function updateCustomerService(
  tenantId: string,
  actorId: string,
  customerId: string,
  data: UpdateCustomerInput,
) {
  const exists = await prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null } })
  if (!exists) throw new AppError('Customer not found', 404)

  const customer = await prisma.customer.update({ where: { id: customerId }, data })

  await logAction({
    tenantId,
    userId: actorId,
    action: 'UPDATE',
    entity: 'Customer',
    entityId: customerId,
    details: data as Record<string, unknown>,
  })

  return customer
}

export async function deleteCustomerService(tenantId: string, actorId: string, customerId: string) {
  const exists = await prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null } })
  if (!exists) throw new AppError('Customer not found', 404)

  await prisma.customer.update({ where: { id: customerId }, data: { deletedAt: new Date() } })

  await logAction({ tenantId, userId: actorId, action: 'DELETE', entity: 'Customer', entityId: customerId })
}
