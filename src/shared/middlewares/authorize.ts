import { FastifyRequest, FastifyReply } from 'fastify'

export function authorize(...roles: ('ADMIN' | 'EMPLOYEE')[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role } = request.user
    if (!roles.includes(role)) {
      reply.status(403).send({ message: 'Forbidden: insufficient permissions' })
    }
  }
}
