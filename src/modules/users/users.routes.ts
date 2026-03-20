import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CreateUserSchema, UpdateUserSchema, UserQuerySchema } from './users.schemas'
import { listUsersService, createUserService, updateUserService, deleteUserService } from './users.service'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

export async function usersRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/',
    {
      schema: { tags: ['Users'], summary: 'List users (admin only)', querystring: UserQuerySchema },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request) => listUsersService(request.user.tenantId, request.query),
  )

  server.post(
    '/',
    {
      schema: { tags: ['Users'], summary: 'Create user (admin only)', body: CreateUserSchema },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request, reply) => {
      const user = await createUserService(request.user.tenantId, request.user.sub, request.body)
      return reply.status(201).send(user)
    },
  )

  server.put(
    '/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update user (admin only)',
        params: z.object({ id: z.string().uuid() }),
        body: UpdateUserSchema,
      },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request) =>
      updateUserService(request.user.tenantId, request.user.sub, request.params.id, request.body),
  )

  server.delete(
    '/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Soft delete user (admin only)',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request, reply) => {
      await deleteUserService(request.user.tenantId, request.user.sub, request.params.id)
      return reply.status(204).send()
    },
  )
}
