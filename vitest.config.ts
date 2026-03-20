import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/orderflow_test',
      JWT_SECRET: 'test-jwt-secret-with-minimum-length',
      COOKIE_SECRET: 'test-cookie-secret',
      NODE_ENV: 'test',
      PORT: '3334',
    },
  },
})
