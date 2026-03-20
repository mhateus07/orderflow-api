import { prisma } from '../../lib/prisma'
import { AppError } from '../../shared/errors/app-error'
import { getPaginationParams, buildPaginatedResult } from '../../shared/utils/paginate'
import { logAction } from '../../shared/utils/action-log'
import { CreateProductInput, UpdateProductInput, ProductQuery } from './products.schemas'

const select = {
  id: true,
  name: true,
  description: true,
  price: true,
  category: true,
  available: true,
  createdAt: true,
}

export async function listProductsService(tenantId: string, query: ProductQuery) {
  const { page, limit, skip } = getPaginationParams(query)

  const where = {
    tenantId,
    deletedAt: null,
    ...(query.search && { name: { contains: query.search, mode: 'insensitive' as const } }),
    ...(query.category && { category: { equals: query.category, mode: 'insensitive' as const } }),
    ...(query.available !== undefined && { available: query.available }),
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({ where, skip, take: limit, orderBy: { name: 'asc' }, select }),
    prisma.product.count({ where }),
  ])

  return buildPaginatedResult(products, total, page, limit)
}

export async function getProductService(tenantId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, deletedAt: null },
    select,
  })
  if (!product) throw new AppError('Product not found', 404)
  return product
}

export async function createProductService(
  tenantId: string,
  actorId: string,
  data: CreateProductInput,
) {
  const product = await prisma.product.create({ data: { tenantId, ...data }, select })

  await logAction({ tenantId, userId: actorId, action: 'CREATE', entity: 'Product', entityId: product.id })

  return product
}

export async function updateProductService(
  tenantId: string,
  actorId: string,
  productId: string,
  data: UpdateProductInput,
) {
  const exists = await prisma.product.findFirst({ where: { id: productId, tenantId, deletedAt: null } })
  if (!exists) throw new AppError('Product not found', 404)

  const product = await prisma.product.update({ where: { id: productId }, data, select })

  await logAction({
    tenantId,
    userId: actorId,
    action: 'UPDATE',
    entity: 'Product',
    entityId: productId,
    details: data as Record<string, unknown>,
  })

  return product
}

export async function deleteProductService(tenantId: string, actorId: string, productId: string) {
  const exists = await prisma.product.findFirst({ where: { id: productId, tenantId, deletedAt: null } })
  if (!exists) throw new AppError('Product not found', 404)

  await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date() } })

  await logAction({ tenantId, userId: actorId, action: 'DELETE', entity: 'Product', entityId: productId })
}
