import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { CreateOrderSchema, UpdateOrderStatusSchema, OrderQuerySchema } from './orders.schemas'
import {
  listOrdersService,
  getOrderService,
  createOrderService,
  updateOrderStatusService,
  deleteOrderService,
} from './orders.service'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

export async function ordersRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/',
    {
      schema: { tags: ['Orders'], summary: 'List orders with filters', querystring: OrderQuerySchema },
      preHandler: [authenticate],
    },
    async (request) => listOrdersService(request.user.tenantId, request.query),
  )

  server.get(
    '/:id',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authenticate],
    },
    async (request) => getOrderService(request.user.tenantId, request.params.id),
  )

  server.post(
    '/',
    {
      schema: { tags: ['Orders'], summary: 'Create order', body: CreateOrderSchema },
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const order = await createOrderService(request.user.tenantId, request.user.sub, request.body)
      return reply.status(201).send(order)
    },
  )

  server.patch(
    '/:id/status',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Update order status (PENDING → PREPARING → DELIVERED | CANCELLED)',
        params: z.object({ id: z.string().uuid() }),
        body: UpdateOrderStatusSchema,
      },
      preHandler: [authenticate],
    },
    async (request) =>
      updateOrderStatusService(request.user.tenantId, request.user.sub, request.params.id, request.body),
  )

  server.delete(
    '/:id',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Cancel/soft delete order (admin only)',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request, reply) => {
      await deleteOrderService(request.user.tenantId, request.user.sub, request.params.id)
      return reply.status(204).send()
    },
  )
}
