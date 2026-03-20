import { describe, it, expect } from 'vitest'
import { getApp } from './helpers/app'
import { registerTenant, registerEmployee, createProduct, createCustomer } from './helpers/factories'

describe('Orders', () => {
  describe('POST /orders', () => {
    it('should create an order with calculated total', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const productId = await createProduct(app, token, { name: 'Pizza', price: 30.0 })

      const res = await app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          items: [{ productId, quantity: 2 }],
        },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.status).toBe('PENDING')
      expect(Number(body.total)).toBe(60)
      expect(body.items).toHaveLength(1)
      expect(body.items[0].quantity).toBe(2)
    })

    it('should create an order linked to a customer', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const productId = await createProduct(app, token)
      const customerId = await createCustomer(app, token)

      const res = await app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${token}` },
        payload: { customerId, items: [{ productId, quantity: 1 }] },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.customer.id).toBe(customerId)
    })

    it('should reject order with unavailable product', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const productId = await createProduct(app, token, { available: false })

      const res = await app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${token}` },
        payload: { items: [{ productId, quantity: 1 }] },
      })

      expect(res.statusCode).toBe(400)
    })

    it('should reject order with empty items array', async () => {
      const app = await getApp()
      const token = await registerTenant(app)

      const res = await app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${token}` },
        payload: { items: [] },
      })

      expect(res.statusCode).toBe(400)
    })

    it('should allow employee to create an order', async () => {
      const app = await getApp()
      const adminToken = await registerTenant(app)
      const employeeToken = await registerEmployee(app, adminToken)
      const productId = await createProduct(app, adminToken)

      const res = await app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${employeeToken}` },
        payload: { items: [{ productId, quantity: 1 }] },
      })

      expect(res.statusCode).toBe(201)
    })
  })

  describe('PATCH /orders/:id/status — status flow', () => {
    async function createOrder(app: Awaited<ReturnType<typeof getApp>>, token: string) {
      const productId = await createProduct(app, token)
      const res = await app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${token}` },
        payload: { items: [{ productId, quantity: 1 }] },
      })
      return JSON.parse(res.body).id as string
    }

    it('should transition PENDING → PREPARING', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const orderId = await createOrder(app, token)

      const res = await app.inject({
        method: 'PATCH',
        url: `/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'PREPARING' },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).status).toBe('PREPARING')
    })

    it('should transition PREPARING → DELIVERED', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const orderId = await createOrder(app, token)

      await app.inject({
        method: 'PATCH',
        url: `/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'PREPARING' },
      })

      const res = await app.inject({
        method: 'PATCH',
        url: `/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'DELIVERED' },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).status).toBe('DELIVERED')
    })

    it('should transition PENDING → CANCELLED', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const orderId = await createOrder(app, token)

      const res = await app.inject({
        method: 'PATCH',
        url: `/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'CANCELLED' },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).status).toBe('CANCELLED')
    })

    it('should reject invalid transition PENDING → DELIVERED', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const orderId = await createOrder(app, token)

      const res = await app.inject({
        method: 'PATCH',
        url: `/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'DELIVERED' },
      })

      expect(res.statusCode).toBe(400)
    })

    it('should reject any transition from DELIVERED', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const orderId = await createOrder(app, token)

      await app.inject({
        method: 'PATCH',
        url: `/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'PREPARING' },
      })
      await app.inject({
        method: 'PATCH',
        url: `/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'DELIVERED' },
      })

      const res = await app.inject({
        method: 'PATCH',
        url: `/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'CANCELLED' },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  describe('Multi-tenant isolation', () => {
    it('should not allow accessing another tenant order', async () => {
      const app = await getApp()

      const tokenA = await registerTenant(app, { restaurantName: 'Restaurant A', email: 'a@test.com' })
      const tokenB = await registerTenant(app, { restaurantName: 'Restaurant B', email: 'b@test.com' })

      const productId = await createProduct(app, tokenA)
      const orderRes = await app.inject({
        method: 'POST',
        url: '/orders',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { items: [{ productId, quantity: 1 }] },
      })
      const orderId = JSON.parse(orderRes.body).id

      // Tenant B tries to access Tenant A's order
      const res = await app.inject({
        method: 'GET',
        url: `/orders/${orderId}`,
        headers: { authorization: `Bearer ${tokenB}` },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
