import crypto from 'crypto'
import { prisma } from '../../lib/prisma'
import { AppError } from '../../shared/errors/app-error'
import { hashPassword, comparePassword } from '../../shared/utils/hash'
import { RegisterInput, LoginInput } from './auth.schemas'

const REFRESH_TOKEN_EXPIRY_DAYS = 7

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex')
}

export async function registerService(data: RegisterInput) {
  let slug = generateSlug(data.restaurantName)

  const existing = await prisma.tenant.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now()}`
  }

  const passwordHash = await hashPassword(data.password)

  const tenant = await prisma.tenant.create({
    data: {
      name: data.restaurantName,
      slug,
      users: {
        create: {
          name: data.adminName,
          email: data.email,
          passwordHash,
          role: 'ADMIN',
        },
      },
    },
    include: { users: true },
  })

  const user = tenant.users[0]
  return { userId: user.id, tenantId: tenant.id, role: user.role }
}

export async function loginService(data: LoginInput) {
  const user = await prisma.user.findFirst({
    where: { email: data.email, deletedAt: null },
  })

  if (!user) throw new AppError('Invalid credentials', 401)

  const isValid = await comparePassword(data.password, user.passwordHash)
  if (!isValid) throw new AppError('Invalid credentials', 401)

  const token = generateRefreshToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

  await prisma.refreshToken.upsert({
    where: { userId: user.id },
    update: { token, expiresAt },
    create: { userId: user.id, token, expiresAt },
  })

  return { userId: user.id, tenantId: user.tenantId, role: user.role, refreshToken: token }
}

export async function refreshService(token: string) {
  const stored = await prisma.refreshToken.findUnique({ where: { token } })

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401)
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } })
  if (!user || user.deletedAt) throw new AppError('User not found', 401)

  // Rotate refresh token
  const newToken = generateRefreshToken()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { token: newToken, expiresAt },
  })

  return { userId: user.id, tenantId: user.tenantId, role: user.role, refreshToken: newToken }
}

export async function logoutService(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}
