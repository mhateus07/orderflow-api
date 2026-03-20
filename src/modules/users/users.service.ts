import { prisma } from '../../lib/prisma'
import { AppError } from '../../shared/errors/app-error'
import { hashPassword } from '../../shared/utils/hash'
import { getPaginationParams, buildPaginatedResult } from '../../shared/utils/paginate'
import { logAction } from '../../shared/utils/action-log'
import { CreateUserInput, UpdateUserInput, UserQuery } from './users.schemas'

export async function listUsersService(tenantId: string, query: UserQuery) {
  const { page, limit, skip } = getPaginationParams(query)

  const where = {
    tenantId,
    deletedAt: null,
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
      ],
    }),
    ...(query.role && { role: query.role }),
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ])

  return buildPaginatedResult(users, total, page, limit)
}

export async function createUserService(tenantId: string, actorId: string, data: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email: data.email } },
  })

  if (existing) throw new AppError('Email already in use', 409)

  const passwordHash = await hashPassword(data.password)

  const user = await prisma.user.create({
    data: { tenantId, name: data.name, email: data.email, passwordHash, role: data.role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  await logAction({ tenantId, userId: actorId, action: 'CREATE', entity: 'User', entityId: user.id })

  return user
}

export async function updateUserService(
  tenantId: string,
  actorId: string,
  userId: string,
  data: UpdateUserInput,
) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, deletedAt: null } })
  if (!user) throw new AppError('User not found', 404)

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true, updatedAt: true },
  })

  await logAction({
    tenantId,
    userId: actorId,
    action: 'UPDATE',
    entity: 'User',
    entityId: userId,
    details: data as Record<string, unknown>,
  })

  return updated
}

export async function deleteUserService(tenantId: string, actorId: string, userId: string) {
  if (actorId === userId) throw new AppError('Cannot delete your own account', 400)

  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, deletedAt: null } })
  if (!user) throw new AppError('User not found', 404)

  await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } })

  await logAction({ tenantId, userId: actorId, action: 'DELETE', entity: 'User', entityId: userId })
}
