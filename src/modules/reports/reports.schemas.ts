import { z } from 'zod'

export const SalesReportQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export type SalesReportQuery = z.infer<typeof SalesReportQuerySchema>
