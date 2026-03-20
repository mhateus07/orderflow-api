import { describe, it, expect } from 'vitest'
import { getApp } from './helpers/app'
import { registerTenant } from './helpers/factories'

describe('Auth', () => {
  describe('POST /auth/register', () => {
    it('should register a new tenant and return access token', async () => {
      const app = await getApp()

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          restaurantName: 'My Restaurant',
          adminName: 'Admin User',
          email: 'admin@myrestaurant.com',
          password: 'password123',
        },
      })

      expect(res.statusCode).toBe(201)
      const body = JSON.parse(res.body)
      expect(body.accessToken).toBeDefined()
      expect(body.message).toBe('Restaurant registered successfully')
    })

    it('should reject invalid email', async () => {
      const app = await getApp()

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          restaurantName: 'My Restaurant',
          adminName: 'Admin',
          email: 'not-an-email',
          password: 'password123',
        },
      })

      expect(res.statusCode).toBe(400)
    })

    it('should reject password shorter than 6 characters', async () => {
      const app = await getApp()

      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          restaurantName: 'My Restaurant',
          adminName: 'Admin',
          email: 'admin@test.com',
          password: '123',
        },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /auth/login', () => {
    it('should login with valid credentials and return access token', async () => {
      const app = await getApp()
      await registerTenant(app)

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@test.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.accessToken).toBeDefined()
    })

    it('should set refresh token as HttpOnly cookie on login', async () => {
      const app = await getApp()
      await registerTenant(app)

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@test.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(200)
      const cookies = res.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(String(cookies)).toContain('refresh_token')
      expect(String(cookies)).toContain('HttpOnly')
    })

    it('should reject wrong password', async () => {
      const app = await getApp()
      await registerTenant(app)

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'admin@test.com', password: 'wrongpassword' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('should reject non-existent email', async () => {
      const app = await getApp()

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@test.com', password: 'password123' },
      })

      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout and clear refresh token cookie', async () => {
      const app = await getApp()
      const token = await registerTenant(app)

      const res = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).message).toBe('Logged out successfully')
    })

    it('should reject logout without token', async () => {
      const app = await getApp()

      const res = await app.inject({ method: 'POST', url: '/auth/logout' })

      expect(res.statusCode).toBe(401)
    })
  })
})
