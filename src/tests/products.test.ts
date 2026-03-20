import { describe, it, expect } from 'vitest'
import { getApp } from './helpers/app'
import { registerTenant, registerEmployee, createProduct } from './helpers/factories'

describe('Products', () => {
  describe('GET /products', () => {
    it('should list products with pagination metadata', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      await createProduct(app, token, { name: 'Pizza', category: 'Pizza' })
      await createProduct(app, token, { name: 'Burger', category: 'Burger' })

      const res = await app.inject({
        method: 'GET',
        url: '/products',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data).toHaveLength(2)
      expect(body.meta.total).toBe(2)
      expect(body.meta.page).toBe(1)
    })

    it('should filter products by category', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      await createProduct(app, token, { name: 'Margherita', category: 'Pizza' })
      await createProduct(app, token, { name: 'Coke', category: 'Drinks' })

      const res = await app.inject({
        method: 'GET',
        url: '/products?category=Pizza',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].name).toBe('Margherita')
    })

    it('should filter products by search term', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      await createProduct(app, token, { name: 'Margherita Pizza' })
      await createProduct(app, token, { name: 'Classic Burger' })

      const res = await app.inject({
        method: 'GET',
        url: '/products?search=pizza',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].name).toBe('Margherita Pizza')
    })

    it('should reject unauthenticated request', async () => {
      const app = await getApp()

      const res = await app.inject({ method: 'GET', url: '/products' })

      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /products', () => {
    it('should create a product when admin', async () => {
      const app = await getApp()
      const token = await registerTenant(app)

      const res = await app.inject({
        method: 'POST',
        url: '/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'New Product', price: 19.9, category: 'Food' },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.id).toBeDefined()
      expect(body.name).toBe('New Product')
      expect(body.available).toBe(true)
    })

    it('should reject product creation when employee', async () => {
      const app = await getApp()
      const adminToken = await registerTenant(app)
      const employeeToken = await registerEmployee(app, adminToken)

      const res = await app.inject({
        method: 'POST',
        url: '/products',
        headers: { authorization: `Bearer ${employeeToken}` },
        payload: { name: 'New Product', price: 19.9 },
      })

      expect(res.statusCode).toBe(403)
    })

    it('should reject product with negative price', async () => {
      const app = await getApp()
      const token = await registerTenant(app)

      const res = await app.inject({
        method: 'POST',
        url: '/products',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Bad Product', price: -5 },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  describe('DELETE /products/:id (soft delete)', () => {
    it('should soft delete a product — it should not appear in listing', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const productId = await createProduct(app, token)

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/products/${productId}`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(deleteRes.statusCode).toBe(204)

      const listRes = await app.inject({
        method: 'GET',
        url: '/products',
        headers: { authorization: `Bearer ${token}` },
      })
      const body = JSON.parse(listRes.body)
      expect(body.meta.total).toBe(0)
    })

    it('should return 404 when accessing a soft-deleted product', async () => {
      const app = await getApp()
      const token = await registerTenant(app)
      const productId = await createProduct(app, token)

      await app.inject({
        method: 'DELETE',
        url: `/products/${productId}`,
        headers: { authorization: `Bearer ${token}` },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/products/${productId}`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('Multi-tenant isolation', () => {
    it('should not expose products from one tenant to another', async () => {
      const app = await getApp()

      const tokenA = await registerTenant(app, {
        restaurantName: 'Restaurant A',
        email: 'admin@a.com',
      })
      const tokenB = await registerTenant(app, {
        restaurantName: 'Restaurant B',
        email: 'admin@b.com',
      })

      await createProduct(app, tokenA, { name: 'Tenant A Secret Product' })

      const res = await app.inject({
        method: 'GET',
        url: '/products',
        headers: { authorization: `Bearer ${tokenB}` },
      })

      const body = JSON.parse(res.body)
      expect(body.meta.total).toBe(0)
      expect(body.data.find((p: { name: string }) => p.name === 'Tenant A Secret Product')).toBeUndefined()
    })
  })
})
