import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { z } from 'zod'
import { CreateProductSchema, UpdateProductSchema, ProductQuerySchema } from './products.schemas'
import {
  listProductsService,
  getProductService,
  createProductService,
  updateProductService,
  deleteProductService,
} from './products.service'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

export async function productsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/',
    {
      schema: { tags: ['Products'], summary: 'List products with filters', querystring: ProductQuerySchema },
      preHandler: [authenticate],
    },
    async (request) => listProductsService(request.user.tenantId, request.query),
  )

  server.get(
    '/:id',
    {
      schema: {
        tags: ['Products'],
        summary: 'Get product by ID',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authenticate],
    },
    async (request) => getProductService(request.user.tenantId, request.params.id),
  )

  server.post(
    '/',
    {
      schema: { tags: ['Products'], summary: 'Create product (admin only)', body: CreateProductSchema },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request, reply) => {
      const product = await createProductService(request.user.tenantId, request.user.sub, request.body)
      return reply.status(201).send(product)
    },
  )

  server.put(
    '/:id',
    {
      schema: {
        tags: ['Products'],
        summary: 'Update product (admin only)',
        params: z.object({ id: z.string().uuid() }),
        body: UpdateProductSchema,
      },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request) =>
      updateProductService(request.user.tenantId, request.user.sub, request.params.id, request.body),
  )

  server.delete(
    '/:id',
    {
      schema: {
        tags: ['Products'],
        summary: 'Soft delete product (admin only)',
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request, reply) => {
      await deleteProductService(request.user.tenantId, request.user.sub, request.params.id)
      return reply.status(204).send()
    },
  )
}
