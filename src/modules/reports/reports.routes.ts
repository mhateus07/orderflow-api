import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from '@fastify/type-provider-zod'
import { SalesReportQuerySchema } from './reports.schemas'
import { getSalesReportService } from './reports.service'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

export async function reportsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/sales',
    {
      schema: {
        tags: ['Reports'],
        summary: 'Sales report: revenue, orders by status, top products, daily breakdown (admin only)',
        querystring: SalesReportQuerySchema,
      },
      preHandler: [authenticate, authorize('ADMIN')],
    },
    async (request) => getSalesReportService(request.user.tenantId, request.query),
  )
}
