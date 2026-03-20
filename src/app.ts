import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import sensible from '@fastify/sensible'
import { ZodError } from 'zod'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'

import { AppError } from './shared/errors/app-error'
import { swaggerPlugin } from './shared/plugins/swagger'
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { productsRoutes } from './modules/products/products.routes'
import { customersRoutes } from './modules/customers/customers.routes'
import { ordersRoutes } from './modules/orders/orders.routes'
import { reportsRoutes } from './modules/reports/reports.routes'

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'production',
  })

  // Zod type provider
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Plugins
  await app.register(sensible)
  await app.register(cookie, { secret: process.env.COOKIE_SECRET ?? 'cookie-secret' })
  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '15m' },
  })
  await app.register(swaggerPlugin)

  // Routes
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(usersRoutes, { prefix: '/users' })
  await app.register(productsRoutes, { prefix: '/products' })
  await app.register(customersRoutes, { prefix: '/customers' })
  await app.register(ordersRoutes, { prefix: '/orders' })
  await app.register(reportsRoutes, { prefix: '/reports' })

  // Health check
  app.get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message })
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    if (error.statusCode === 401) {
      return reply.status(401).send({ message: 'Unauthorized' })
    }

    app.log.error(error)
    return reply.status(500).send({ message: 'Internal server error' })
  })

  return app
}
