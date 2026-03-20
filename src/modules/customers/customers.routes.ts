import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { z } from 'zod'
import { CreateCustomerSchema, UpdateCustomerSchema, CustomerQuerySchema } from './customers.schemas'
import {
  listCustomersService,
  getCustomerService,
  createCustomerService,
  updateCustomerService,
  deleteCustomerService,
} from './customers.service'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

export async function customersRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/',
    {
      schema: { tags: ['Customers'], summary: 'List customers', querystring: CustomerQuerySchema },
      preHandler: [authenticate],
    },
    async (request) => listCustomersService(request.user.tenantId, request.query),
  )

  server.get(
    '/:id',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Get customer by ID with recent orders',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authenticate],
    },
    async (request) => getCustomerService(request.user.tenantId, request.params.id),
  )

  server.post(
    '/',
    {
      schema: { tags: ['Customers'], summary: 'Create customer', body: CreateCustomerSchema },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const customer = await createCustomerService(request.user.tenantId, request.user.sub, request.body)
      return reply.status(201).send(customer)
    },
  )

  server.put(
    '/:id',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Update customer',
        params: z.object({ id: z.string().uuid() }),
        body: UpdateCustomerSchema,
      },
      preHandler: [authenticate],
    },
    async (request) =>
      updateCustomerService(request.user.tenantId, request.user.sub, request.params.id, request.body),
  )

  server.delete(
    '/:id',
    {
      schema: {
        tags: ['Customers'],
        summary: 'Soft delete customer (admin only)',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request, reply) => {
      await deleteCustomerService(request.user.tenantId, request.user.sub, request.params.id)
      return reply.status(204).send()
    },
  )
}
