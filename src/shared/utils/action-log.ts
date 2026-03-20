import { prisma } from '../../lib/prisma'

interface LogActionParams {
  tenantId: string
  userId: string
  action: string
  entity: string
  entityId?: string
  details?: Record<string, unknown>
}

export async function logAction(params: LogActionParams): Promise<void> {
  await prisma.actionLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details,
    },
  })
}
