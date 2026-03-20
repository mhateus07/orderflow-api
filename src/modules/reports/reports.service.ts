import { prisma } from '../../lib/prisma'
import { SalesReportQuery } from './reports.schemas'

export async function getSalesReportService(tenantId: string, query: SalesReportQuery) {
  const startDate = new Date(query.startDate)
  const endDate = new Date(query.endDate)

  const deliveredWhere = {
    tenantId,
    status: 'DELIVERED' as const,
    deletedAt: null,
    createdAt: { gte: startDate, lte: endDate },
  }

  const [summary, byStatus, topProducts, dailyOrders] = await prisma.$transaction([
    prisma.order.aggregate({
      where: deliveredWhere,
      _sum: { total: true },
      _count: { _all: true },
      _avg: { total: true },
    }),

    prisma.order.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null, createdAt: { gte: startDate, lte: endDate } },
      _count: { _all: true },
      _sum: { total: true },
    }),

    prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: deliveredWhere },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: 'desc' } },
      take: 10,
    }),

    prisma.order.findMany({
      where: deliveredWhere,
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const productIds = topProducts.map((p) => p.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p.name]))

  const dailyBreakdown = dailyOrders.reduce<Record<string, { date: string; revenue: number; orders: number }>>(
    (acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0]
      if (!acc[date]) acc[date] = { date, revenue: 0, orders: 0 }
      acc[date].revenue += Number(order.total)
      acc[date].orders += 1
      return acc
    },
    {},
  )

  return {
    period: { startDate: query.startDate, endDate: query.endDate },
    summary: {
      totalRevenue: Number(summary._sum.total ?? 0),
      totalOrders: summary._count._all,
      averageOrderValue: Number(summary._avg.total ?? 0),
    },
    byStatus: byStatus.map((s) => ({
      status: s.status,
      count: s._count._all,
      total: Number(s._sum.total ?? 0),
    })),
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: productMap.get(p.productId) ?? 'Unknown',
      quantitySold: p._sum.quantity ?? 0,
      revenue: Number(p._sum.subtotal ?? 0),
    })),
    dailyBreakdown: Object.values(dailyBreakdown),
  }
}
