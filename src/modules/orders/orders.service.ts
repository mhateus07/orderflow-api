import { prisma } from '../../lib/prisma'
import { AppError } from '../../shared/errors/app-error'
import { getPaginationParams, buildPaginatedResult } from '../../shared/utils/paginate'
import { logAction } from '../../shared/utils/action-log'
import { CreateOrderInput, UpdateOrderStatusInput, OrderQuery } from './orders.schemas'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

const orderInclude = {
  customer: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, name: true, price: true } } },
  },
}

export async function listOrdersService(tenantId: string, query: OrderQuery) {
  const { page, limit, skip } = getPaginationParams(query)

  const where = {
    tenantId,
    deletedAt: null,
    ...(query.status && { status: query.status }),
    ...(query.customerId && { customerId: query.customerId }),
    ...((query.startDate || query.endDate) && {
      createdAt: {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate) }),
      },
    }),
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: orderInclude }),
    prisma.order.count({ where }),
  ])

  return buildPaginatedResult(orders, total, page, limit)
}

export async function getOrderService(tenantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, deletedAt: null },
    include: orderInclude,
  })
  if (!order) throw new AppError('Order not found', 404)
  return order
}

export async function createOrderService(tenantId: string, actorId: string, data: CreateOrderInput) {
  if (data.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, tenantId, deletedAt: null },
    })
    if (!customer) throw new AppError('Customer not found', 404)
  }

  const productIds = data.items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId, deletedAt: null, available: true },
  })

  if (products.length !== productIds.length) {
    throw new AppError('One or more products not found or unavailable', 400)
  }

  const productMap = new Map(products.map((p) => [p.id, p]))

  let total = 0
  const items = data.items.map((item) => {
    const product = productMap.get(item.productId)!
    const unitPrice = Number(product.price)
    const subtotal = unitPrice * item.quantity
    total += subtotal
    return { productId: item.productId, quantity: item.quantity, unitPrice, subtotal }
  })

  const order = await prisma.order.create({
    data: {
      tenantId,
      customerId: data.customerId,
      notes: data.notes,
      total,
      items: { create: items },
    },
    include: orderInclude,
  })

  await logAction({
    tenantId,
    userId: actorId,
    action: 'CREATE',
    entity: 'Order',
    entityId: order.id,
    details: { total, itemCount: items.length },
  })

  return order
}

export async function updateOrderStatusService(
  tenantId: string,
  actorId: string,
  orderId: string,
  data: UpdateOrderStatusInput,
) {
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId, deletedAt: null } })
  if (!order) throw new AppError('Order not found', 404)

  if (!VALID_TRANSITIONS[order.status].includes(data.status)) {
    throw new AppError(`Cannot transition order from ${order.status} to ${data.status}`, 400)
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: data.status },
    include: orderInclude,
  })

  await logAction({
    tenantId,
    userId: actorId,
    action: 'STATUS_CHANGE',
    entity: 'Order',
    entityId: orderId,
    details: { from: order.status, to: data.status },
  })

  return updated
}

export async function deleteOrderService(tenantId: string, actorId: string, orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId, deletedAt: null } })
  if (!order) throw new AppError('Order not found', 404)

  if (order.status === 'DELIVERED') {
    throw new AppError('Cannot cancel a delivered order', 400)
  }

  await prisma.order.update({ where: { id: orderId }, data: { deletedAt: new Date() } })

  await logAction({ tenantId, userId: actorId, action: 'DELETE', entity: 'Order', entityId: orderId })
}
