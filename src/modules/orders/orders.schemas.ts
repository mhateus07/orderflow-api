import { z } from 'zod'

export const CreateOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, 'Order must have at least one item'),
})

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED']),
})

export const OrderQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'PREPARING', 'DELIVERED', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>
export type OrderQuery = z.infer<typeof OrderQuerySchema>
