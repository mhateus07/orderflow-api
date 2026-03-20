import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      tenantId: string
      role: 'ADMIN' | 'EMPLOYEE'
    }
    user: {
      sub: string
      tenantId: string
      role: 'ADMIN' | 'EMPLOYEE'
    }
  }
}
