import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { z } from 'zod'
import { RegisterSchema, LoginSchema } from './auth.schemas'
import { registerService, loginService, refreshService, logoutService } from './auth.service'
import { authenticate } from '../../shared/middlewares/authenticate'

const COOKIE_NAME = 'refresh_token'

const cookieOptions = (env: string | undefined) => ({
  httpOnly: true,
  secure: env === 'production',
  sameSite: 'strict' as const,
  path: '/auth/refresh',
  maxAge: 60 * 60 * 24 * 7,
})

export async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new restaurant (tenant) with admin user',
        body: RegisterSchema,
        response: {
          201: z.object({ message: z.string(), accessToken: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const result = await registerService(request.body)
      const accessToken = app.jwt.sign({ sub: result.userId, tenantId: result.tenantId, role: result.role })
      return reply.status(201).send({ message: 'Restaurant registered successfully', accessToken })
    },
  )

  server.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Login and receive access token',
        body: LoginSchema,
        response: {
          200: z.object({ accessToken: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const result = await loginService(request.body)
      const accessToken = app.jwt.sign({ sub: result.userId, tenantId: result.tenantId, role: result.role })
      reply.setCookie(COOKIE_NAME, result.refreshToken, cookieOptions(process.env.NODE_ENV))
      return reply.send({ accessToken })
    },
  )

  server.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Get new access token using refresh token cookie',
        response: {
          200: z.object({ accessToken: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const token = request.cookies[COOKIE_NAME]
      if (!token) return reply.status(401).send({ message: 'Refresh token not found' })

      const result = await refreshService(token)
      const accessToken = app.jwt.sign({ sub: result.userId, tenantId: result.tenantId, role: result.role })
      reply.setCookie(COOKIE_NAME, result.refreshToken, cookieOptions(process.env.NODE_ENV))
      return reply.send({ accessToken })
    },
  )

  server.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout and invalidate refresh token',
        response: {
          200: z.object({ message: z.string() }),
        },
      },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      await logoutService(request.user.sub)
      reply.clearCookie(COOKIE_NAME)
      return { message: 'Logged out successfully' }
    },
  )
}
