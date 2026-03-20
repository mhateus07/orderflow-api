import { FastifyInstance } from 'fastify'

interface RegisterOptions {
  restaurantName?: string
  adminName?: string
  email?: string
  password?: string
}

/**
 * Registers a new tenant and returns the admin access token.
 */
export async function registerTenant(
  app: FastifyInstance,
  options: RegisterOptions = {},
): Promise<string> {
  const payload = {
    restaurantName: options.restaurantName ?? 'Test Restaurant',
    adminName: options.adminName ?? 'Admin User',
    email: options.email ?? 'admin@test.com',
    password: options.password ?? 'password123',
  }

  const res = await app.inject({ method: 'POST', url: '/auth/register', payload })
  if (res.statusCode !== 201) throw new Error(`Register failed: ${res.body}`)
  return JSON.parse(res.body).accessToken
}

/**
 * Registers a tenant and creates an employee user, returns employee token.
 */
export async function registerEmployee(
  app: FastifyInstance,
  adminToken: string,
  email = 'employee@test.com',
): Promise<string> {
  await app.inject({
    method: 'POST',
    url: '/users',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { name: 'Employee', email, password: 'password123', role: 'EMPLOYEE' },
  })

  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { email, password: 'password123' },
  })
  return JSON.parse(res.body).accessToken
}

/**
 * Creates a product and returns its ID.
 */
export async function createProduct(
  app: FastifyInstance,
  adminToken: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/products',
    headers: { authorization: `Bearer ${adminToken}` },
    payload: { name: 'Test Product', price: 29.9, ...overrides },
  })
  if (res.statusCode !== 201) throw new Error(`Create product failed: ${res.body}`)
  return JSON.parse(res.body).id
}

/**
 * Creates a customer and returns its ID.
 */
export async function createCustomer(
  app: FastifyInstance,
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/customers',
    headers: { authorization: `Bearer ${token}` },
    payload: { name: 'Test Customer', ...overrides },
  })
  if (res.statusCode !== 201) throw new Error(`Create customer failed: ${res.body}`)
  return JSON.parse(res.body).id
}
